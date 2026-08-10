import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components, internal } from "./_generated/api";
import {
  environmentalMetadataValidator,
  nearbyHospitalsValidator,
} from "./schema";
import type { Doc, Id } from "./_generated/dataModel";
import { getOwnedConversation, requireConversation } from "./lib/auth";
import { MAX_MESSAGE_LENGTH, RESPONSE_TIMEOUT_MS } from "../lib/chatLimits";

/**
 * How many trailing messages are replayed to Gemini as conversation memory.
 * Standing facts about the traveller live in their health profile instead
 * (see convex/ai/systemPrompt.ts), so this only has to carry the thread of the
 * current exchange.
 */
const CONTEXT_MESSAGE_LIMIT = 20;

/**
 * How much of a conversation the client loads. Bounded rather than unbounded:
 * `.collect()` here would read every message ever sent in the thread on every
 * reactive update. Past this the oldest messages stop being fetched — if
 * conversations ever run this long, this is the query to paginate.
 */
const MESSAGE_HISTORY_LIMIT = 200;

/**
 * Every message costs a Gemini turn plus up to three third-party lookups, so
 * the ceiling is per-user rather than per-conversation. Generous enough that
 * nobody typing in good faith will meet it.
 */
const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendMessage: { kind: "token bucket", rate: 12, period: MINUTE, capacity: 12 },
});

const TRUNCATION_NOTICE =
  "This reply was cut off before it finished — treat it as incomplete and ask again.";

const ABANDONED_TEXT =
  "This reply stopped partway through and never recovered. Please ask again.";

/**
 * Closes out a reply whose action died without reporting anything — an action
 * timeout, or a deploy landing mid-generation.
 *
 * Doing this from `createMessage` rather than a sweeping cron means a
 * conversation heals the moment someone tries to use it again, and there is no
 * scheduled job to forget about.
 */
async function abandonInFlightReply(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
) {
  const stranded = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .order("desc")
    .filter((q) => q.eq(q.field("status"), "streaming"))
    .take(5);

  for (const message of stranded) {
    await ctx.db.patch(message._id, {
      status: "error",
      text: message.text
        ? `${TRUNCATION_NOTICE}\n\n${message.text}`
        : ABANDONED_TEXT,
    });
  }
}

/**
 * The only message-writing mutation the client can call, so it is fixed to
 * `role: "user"` — assistant rows are written by convex/chat.ts through the
 * internal mutations below.
 *
 * It also schedules the reply. The client used to await the whole assistant
 * action, which meant a dropped connection mid-generation surfaced "your
 * message couldn't be sent" over a reply that was about to arrive perfectly
 * fine. Now the client awaits an insert, and the reply arrives over the same
 * query subscription as everything else.
 */
export const createMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const { user, conversation } = await requireConversation(
      ctx,
      args.conversationId,
    );

    const text = args.text.trim();

    // ConvexError, not Error: a production deployment redacts the message of a
    // plain throw, and everything below is meant to be read by the person
    // typing.
    if (!text) {
      throw new ConvexError("Message is empty.");
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new ConvexError(
        `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
      );
    }

    const now = Date.now();

    // One reply at a time. Checked here because a mutation is a transaction:
    // two sends racing cannot both see an unlocked conversation, which a
    // client-side "is it replying?" guard could never guarantee.
    if (conversation.respondingSince !== undefined) {
      if (now - conversation.respondingSince < RESPONSE_TIMEOUT_MS) {
        throw new ConvexError(
          "I'm still answering your last message — give me a moment.",
        );
      }

      await abandonInFlightReply(ctx, args.conversationId);
    }

    // After the checks above, so a rejected send does not spend quota.
    const status = await rateLimiter.limit(ctx, "sendMessage", {
      key: user._id,
    });

    if (!status.ok) {
      const seconds = Math.max(1, Math.ceil(status.retryAfter / 1000));

      throw new ConvexError(
        `You're sending messages faster than I can answer them. Try again in ${seconds}s.`,
      );
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      text,
      status: "complete",
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      updatedAt: now,
      respondingSince: now,
    });

    // Ownership was checked above, so the scheduled action inherits it.
    await ctx.scheduler.runAfter(0, internal.chat.processUserMessage, {
      conversationId: args.conversationId,
    });

    return messageId;
  },
});

/** Internal: called by convex/chat.ts once ownership has been verified. */
export const createStreamingMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      text: "",
      status: "streaming",
      createdAt: Date.now(),
    });
  },
});

/**
 * Writes the whole reply-so-far rather than appending a delta.
 *
 * The action already holds the full string, so passing it wholesale saves a
 * read per chunk — and, more usefully, makes the write idempotent: a retried
 * model turn overwrites the previous attempt instead of leaving two copies of
 * the answer concatenated in the bubble.
 */
export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { text: args.text });
  },
});

export const finishStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
    environmentalMetadata: v.optional(environmentalMetadataValidator),
    nearbyHospitals: v.optional(nearbyHospitalsValidator),
  },

  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Streaming message not found.");
    }

    await ctx.db.patch(args.messageId, {
      // The canonical text, which may differ from the last streamed frame if
      // the model closed with a code fence or stopped mid-flush.
      text: args.text,
      status: "complete",
      environmentalMetadata: args.environmentalMetadata,
      nearbyHospitals: args.nearbyHospitals,
    });

    await ctx.db.patch(message.conversationId, {
      updatedAt: Date.now(),
      respondingSince: undefined,
    });
  },
});

/** Marks a half-streamed message as failed so it cannot hang on "streaming". */
export const failMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    fallbackText: v.string(),
  },

  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      return;
    }

    // Partial advice is kept, but never silently: health advice that stops
    // early may be missing the sentence that mattered, and the row alone
    // cannot say so once it is rendered as prose.
    const text = message.text
      ? `${TRUNCATION_NOTICE}\n\n${message.text}`
      : args.fallbackText;

    await ctx.db.patch(args.messageId, {
      status: "error",
      text,
    });

    await ctx.db.patch(message.conversationId, {
      respondingSince: undefined,
    });
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    // Degrades to [] rather than throwing: a subscribed MessageList can
    // outlive the conversation it was rendering (e.g. after a delete).
    const conversation = await getOwnedConversation(ctx, args.conversationId);

    if (!conversation) {
      return [];
    }

    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(MESSAGE_HISTORY_LIMIT);

    return recent.reverse();
  },
});

/**
 * Replays what a past reply already looked up, so the model can answer
 * "what about tomorrow?" without geocoding and re-fetching the same place.
 * This text exists only in the model's context — it is never stored, and never
 * rendered.
 */
function describeStoredConditions(message: Doc<"messages">): string {
  const metadata = message.environmentalMetadata;

  if (!metadata) {
    return "";
  }

  const readings: string[] = [];
  const add = (label: string, value: number | undefined, unit: string) => {
    if (value !== undefined) {
      readings.push(`${label} ${value}${unit}`);
    }
  };

  add("temperature", metadata.temperature, "°C");
  add("heat index", metadata.heatIndex, "°C");
  add("humidity", metadata.humidity, "%");
  add("wind", metadata.windSpeed, " km/h");
  add("UV index", metadata.uvIndex, "");
  add("rain probability", metadata.rainProbability, "%");
  add("PM2.5", metadata.pm25, "");
  add("PM10", metadata.pm10, "");
  add("elevation", metadata.altitude, " m");

  if (readings.length === 0) {
    return "";
  }

  const place = metadata.locationName || "the location above";

  return `\n\n[Already fetched this conversation — ${place} (${metadata.latitude}, ${metadata.longitude}): ${readings.join(", ")}. Reuse these instead of calling the tool again unless the user asks about somewhere else.]`;
}

/** Internal: conversation memory for convex/ai/orchestrator.ts. */
export const getConversationContext = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    // Newest-first with the exclusions pushed into the scan, so this reads the
    // last N usable messages rather than the whole thread. This runs on every
    // single turn — collecting the full history to keep the tail of it got
    // steadily more expensive with every message sent.
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .filter((q) =>
        q.and(q.neq(q.field("status"), "error"), q.neq(q.field("text"), "")),
      )
      .take(CONTEXT_MESSAGE_LIMIT);

    return recent.reverse().map((message) => ({
      role: message.role,
      text: `${message.text}${describeStoredConditions(message)}`,
    }));
  },
});

/**
 * Internal: the text convex/chat.ts names a new conversation from. Read from
 * the stored row rather than taken as an argument, so the title always
 * reflects what was actually saved.
 */
export const getFirstUserMessageText = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .filter((q) => q.eq(q.field("role"), "user"))
      .first();

    return message?.text ?? null;
  },
});
