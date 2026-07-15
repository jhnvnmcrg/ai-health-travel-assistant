import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    status: v.optional(
      v.union(
        v.literal("sending"),
        v.literal("streaming"),
        v.literal("complete"),
        v.literal("error"),
      ),
    ),

    environmentalMetadata: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        altitude: v.number(),
        temperature: v.number(),
        humidity: v.number(),
        windSpeed: v.number(),
        pm25: v.number(),
        pm10: v.number(),
        safetyVerdict: v.union(
          v.literal("Safe"),
          v.literal("Caution"),
          v.literal("High Risk"),
        ),
      }),
    ),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      text: args.text,
      createdAt: Date.now(),

      ...(args.status && { status: args.status }),
      ...(args.environmentalMetadata && {
        environmentalMetadata: args.environmentalMetadata,
      }),
    });
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();
  },
});
