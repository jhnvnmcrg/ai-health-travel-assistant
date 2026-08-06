import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Shared validators for the persisted AI payload. convex/messages.ts imports
 * these instead of re-declaring them, so the shape is written once on the
 * Convex side. Keep `AIResponse` in convex/ai/types.ts and the RESPONSE FORMAT
 * block in convex/ai/systemPrompt.ts in sync with it.
 */
export const environmentalMetadataValidator = v.object({
  /** Added server-side in convex/chat.ts from the geocoder, not by the model. */
  locationName: v.optional(v.string()),
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
});

export const nearbyHospitalsValidator = v.array(
  v.object({
    name: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  }),
);

export const messageStatusValidator = v.union(
  v.literal("sending"),
  v.literal("streaming"),
  v.literal("complete"),
  v.literal("error"),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    displayName: v.optional(v.string()),

    healthConditions: v.optional(v.array(v.string())),
    preferences: v.optional(
      v.object({
        preferredLanguage: v.optional(v.string()),
        units: v.optional(v.union(v.literal("metric"), v.literal("imperial"))),
      }),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_email", ["email"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_updated", ["updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    status: v.optional(messageStatusValidator),
    toolCalls: v.optional(v.any()),
    toolResults: v.optional(v.any()),
    environmentalMetadata: v.optional(environmentalMetadataValidator),
    nearbyHospitals: v.optional(nearbyHospitalsValidator),

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created", ["createdAt"]),
});
