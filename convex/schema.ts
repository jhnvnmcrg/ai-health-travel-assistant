import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Shared validators for the persisted AI payload. convex/messages.ts imports
 * these instead of re-declaring them, so the shape is written once on the
 * Convex side.
 *
 * Everything here is captured from the tool results by
 * convex/ai/orchestrator.ts and written by convex/chat.ts — the model never
 * supplies these numbers, so there is no prompt-side mirror of this shape to
 * keep in sync. See `AIResponse` in convex/ai/types.ts for the (much smaller)
 * thing the model does return.
 */
export const environmentalMetadataValidator = v.object({
  /** The geocoder's own name for what it matched. */
  locationName: v.optional(v.string()),
  latitude: v.number(),
  longitude: v.number(),

  // Optional because the upstream feeds return null for some coordinates. A
  // dropped metric is honest; `pm25: 0` would read as "Good" air.
  altitude: v.optional(v.number()),
  temperature: v.optional(v.number()),
  humidity: v.optional(v.number()),
  windSpeed: v.optional(v.number()),
  uvIndex: v.optional(v.number()),
  rainProbability: v.optional(v.number()),
  heatIndex: v.optional(v.number()),
  pm25: v.optional(v.number()),
  pm10: v.optional(v.number()),

  /** Merged in from the model's top-level verdict by convex/chat.ts. */
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

    /**
     * Injected into every system instruction by convex/ai/systemPrompt.ts, so
     * a condition stated once keeps applying after it has scrolled out of the
     * conversation window.
     */
    healthConditions: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_email", ["email"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),

    /**
     * When the in-flight reply started, or absent if none is running. Set by
     * `messages.createMessage` as it schedules the reply and cleared when that
     * reply finishes or fails.
     *
     * It is the lock that stops two turns interleaving in one conversation,
     * and because it is a timestamp rather than a boolean, a reply that was
     * killed mid-flight expires instead of wedging the conversation forever.
     */
    respondingSince: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    // Compound, so "this user's conversations, most recently active first" is
    // one index scan. Ordering on `_creationTime` instead would surface the
    // newest-created conversation rather than the one just used.
    .index("by_user_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    status: v.optional(messageStatusValidator),
    environmentalMetadata: v.optional(environmentalMetadataValidator),
    nearbyHospitals: v.optional(nearbyHospitalsValidator),

    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  /**
   * Nominatim asks callers to stay under ~1 request/second and to cache what
   * they get back. Place coordinates effectively never move, so this is a long
   * TTL — live conditions are fetched fresh every time and are not cached here.
   */
  geocodeCache: defineTable({
    /** Lower-cased, whitespace-collapsed lookup string. */
    query: v.string(),
    locationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    fetchedAt: v.number(),
  }).index("by_query", ["query"]),
});
