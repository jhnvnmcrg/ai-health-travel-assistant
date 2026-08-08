import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  environmentalMetadataValidator,
  nearbyHospitalsValidator,
} from "./schema";
import type { Doc } from "./_generated/dataModel";
import { getOwnedConversation, requireConversation } from "./lib/auth";

/**
 * How many trailing messages are replayed to Gemini as conversation memory.
 * Standing facts about the traveller live in their health profile instead
 * (see convex/ai/systemPrompt.ts), so this only has to carry the thread of the
 * current exchange.
 */
const CONTEXT_MESSAGE_LIMIT = 20;

/**
 * The composer caps input at 500 characters, but that is a client-side
 * courtesy — this is the limit, because a direct call to this mutation is not
 * bound by the UI.
 */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Every message costs a Gemini turn plus up to three third-party lookups, so
 * the ceiling is per-user rather than per-request. Generous enough that no one
 * typing in good faith will ever see it.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 12;

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
    await requireConversation(ctx, args.conversationId);

    const text = args.text.trim();

    // ConvexError, not Error: a production deployment redacts the message of a
    // plain throw, and these three are meant to be read by the person typing.
    if (!text) {
      throw new ConvexError("Message is empty.");
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new ConvexError(
        `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`,
      );
    }

    const now = Date.now();

    const recent = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(RATE_LIMIT_MAX_MESSAGES * 3);

    const sentInWindow = recent.filter(
      (message) =>
        message.role === "user" &&
        message.createdAt > now - RATE_LIMIT_WINDOW_MS,
    ).length;

    if (sentInWindow >= RATE_LIMIT_MAX_MESSAGES) {
      throw new ConvexError(
        "You're sending messages faster than I can answer them. Give it a moment.",
      );
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      text,
      status: "complete",
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, { updatedAt: now });

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

    await ctx.db.patch(message.conversationId, { updatedAt: Date.now() });
  },
});

const TRUNCATION_NOTICE =
  "This reply was cut off before it finished — treat it as incomplete and ask again.";

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

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
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
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    return messages
      .filter((message) => message.status !== "error" && message.text !== "")
      .slice(-CONTEXT_MESSAGE_LIMIT)
      .map((message) => ({
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
