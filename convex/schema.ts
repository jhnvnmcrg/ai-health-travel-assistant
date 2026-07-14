import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

    title: v.string(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_updated", ["updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),

    role: v.union(v.literal("user"), v.literal("assistant")),

    text: v.string(),

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

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created", ["createdAt"]),
});
