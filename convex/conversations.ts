import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthedUser, requireConversation, requireUser } from "./lib/auth";

/** How many conversations the switcher lists. */
const CONVERSATION_LIST_LIMIT = 50;

export const createConversation = mutation({
  args: {},

  handler: async (ctx) => {
    const user = await requireUser(ctx);

    // Reuse the most recent conversation if nothing has been said in it yet.
    // "New chat" is a button someone can press three times in a row, and each
    // press would otherwise leave an identical empty thread in the switcher.
    const [latest] = await ctx.db
      .query("conversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1);

    if (latest) {
      const firstMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", latest._id))
        .first();

      if (!firstMessage) {
        return latest._id;
      }
    }

    const now = Date.now();

    return await ctx.db.insert("conversations", {
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Internal: convex/chat.ts runs as a scheduled action with no caller identity,
 * so it reads the conversation through this rather than the ownership-checked
 * public query. `messages.createMessage` verified ownership before scheduling.
 */
export const getById = internalQuery({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});

/** Internal: only convex/chat.ts sets titles, after it has verified ownership. */
export const updateTitle = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    await requireConversation(ctx, args.conversationId);

    // The conversation row goes first: it leaves the list immediately, and
    // `listMessages` resolves ownership through it, so the messages become
    // unreachable the moment this commits.
    await ctx.db.delete(args.conversationId);

    // Then the messages, in batches. A single mutation has a cap on documents
    // written, and one long conversation can exceed it — which would have
    // failed the whole delete rather than part of it.
    await ctx.scheduler.runAfter(0, internal.conversations.deleteMessageBatch, {
      conversationId: args.conversationId,
    });
  },
});

/** How many messages one cleanup transaction removes before rescheduling. */
const DELETE_BATCH_SIZE = 100;

export const deleteMessageBatch = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args): Promise<void> => {
    const batch = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .take(DELETE_BATCH_SIZE);

    for (const message of batch) {
      await ctx.db.delete(message._id);
    }

    if (batch.length === DELETE_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.conversations.deleteMessageBatch,
        args,
      );
    }
  },
});

export const listConversations = query({
  args: {},

  handler: async (ctx) => {
    const user = await getAuthedUser(ctx);

    if (!user) {
      return [];
    }

    // Most recently active first — the UI treats `conversations[0]` as the
    // current conversation, so this has to follow `updatedAt`, not creation
    // order. Bounded, because this is subscribed to for the whole session.
    return await ctx.db
      .query("conversations")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(CONVERSATION_LIST_LIMIT);
  },
});

/**
 * Throws unless the caller owns the conversation — convex/chat.ts relies on
 * that to gate `processUserMessage`, so keep the throw.
 */
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    const { conversation } = await requireConversation(
      ctx,
      args.conversationId,
    );

    return conversation;
  },
});
