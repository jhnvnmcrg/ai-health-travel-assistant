import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createConversation = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("conversations", {
      userId: args.userId,
      title: args.title,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTitle = mutation({
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
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    return await ctx.db.get(args.conversationId);
  },
});
