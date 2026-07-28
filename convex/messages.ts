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
        uvIndex: v.number(),
        rainProbability: v.number(),
        heatIndex: v.number(),
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

export const createAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
    environmentalMetadata: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        altitude: v.number(),
        temperature: v.number(),
        humidity: v.number(),
        windSpeed: v.number(),
        uvIndex: v.number(),
        rainProbability: v.number(),
        heatIndex: v.number(),
        pm25: v.number(),
        pm10: v.number(),
        safetyVerdict: v.union(
          v.literal("Safe"),
          v.literal("Caution"),
          v.literal("High Risk"),
        ),
      }),
    ),
    nearbyHospitals: v.optional(
      v.array(
        v.object({
          name: v.string(),
          latitude: v.number(),
          longitude: v.number(),
        }),
      ),
    ),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "assistant",
      text: args.text,
      environmentalMetadata: args.environmentalMetadata,
      nearbyHospitals: args.nearbyHospitals,
      status: "complete",
      createdAt: Date.now(),
    });
  },
});

export const createStreamingMessage = mutation({
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

export const appendToStreamingMessage = mutation({
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

export const finishStreamingMessage = mutation({
  args: {
    messageId: v.id("messages"),
    environmentalMetadata: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        altitude: v.number(),
        temperature: v.number(),
        humidity: v.number(),
        windSpeed: v.number(),
        uvIndex: v.number(),
        rainProbability: v.number(),
        heatIndex: v.number(),
        pm25: v.number(),
        pm10: v.number(),
        safetyVerdict: v.union(
          v.literal("Safe"),
          v.literal("Caution"),
          v.literal("High Risk"),
        ),
      }),
    ),
    nearbyHospitals: v.optional(
      v.array(
        v.object({
          name: v.string(),
          latitude: v.number(),
          longitude: v.number(),
        }),
      ),
    ),
  },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      status: "complete",
      environmentalMetadata: args.environmentalMetadata,
      nearbyHospitals: args.nearbyHospitals,
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

export const getConversationContext = query({
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

    return messages.slice(-5).map((message) => ({
      role: message.role,
      text: message.text,
    }));
  },
});
