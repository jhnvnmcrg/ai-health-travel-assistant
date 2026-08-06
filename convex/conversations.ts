import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthedUser, requireConversation, requireUser } from "./lib/auth";

export const createConversation = mutation({
  args: {
    title: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
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

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.conversationId);
  },
});

export const listConversations = query({
  args: {},

  handler: async (ctx) => {
    const user = await getAuthedUser(ctx);

    if (!user) {
      return [];
    }

    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
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
