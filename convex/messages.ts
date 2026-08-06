import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import {
  environmentalMetadataValidator,
  nearbyHospitalsValidator,
} from "./schema";
import { getOwnedConversation, requireConversation } from "./lib/auth";

/** How many trailing messages are replayed to Gemini as conversation memory. */
const CONTEXT_MESSAGE_LIMIT = 5;

/**
 * The only message-writing mutation the client can call, so it is fixed to
 * `role: "user"` — assistant rows are written by convex/chat.ts through the
 * internal mutations below.
 */
export const createMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    await requireConversation(ctx, args.conversationId);

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "user",
      text: args.text,
      status: "complete",
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, { updatedAt: now });

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

export const appendToStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    textChunk: v.string(),
  },

  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Streaming message not found.");
    }

    await ctx.db.patch(args.messageId, {
      text: message.text + args.textChunk,
    });
  },
});

export const finishStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    environmentalMetadata: v.optional(environmentalMetadataValidator),
    nearbyHospitals: v.optional(nearbyHospitalsValidator),
  },

  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Streaming message not found.");
    }

    await ctx.db.patch(args.messageId, {
      status: "complete",
      environmentalMetadata: args.environmentalMetadata,
      nearbyHospitals: args.nearbyHospitals,
    });

    await ctx.db.patch(message.conversationId, { updatedAt: Date.now() });
  },
});

/** Assistant-side failure the user should see, instead of silence. */
export const createErrorMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      text: args.text,
      status: "error",
      createdAt: Date.now(),
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

    await ctx.db.patch(args.messageId, {
      status: "error",
      text: message.text || args.fallbackText,
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
        text: message.text,
      }));
  },
});
