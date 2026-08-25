import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { runHealthTravelAssistant } from "./ai/orchestrator";
import { buildEnvironmentalMetadata } from "./lib/messagePayload";
import { planTripReminder } from "../lib/tripSchedule";

const MAX_DESTINATION_LENGTH = 120;

/** How many upcoming trips one user may hold reminders for. */
const MAX_ACTIVE_TRIPS = 20;

/**
 * How long to wait before retrying a reminder that collided with a live
 * turn. Comfortably longer than RESPONSE_TIMEOUT_MS, so the lock is
 * guaranteed free by then even if the other reply died.
 */
const REMINDER_RETRY_MS = 5 * 60 * 1000;

const REMINDER_FAILURE_TEXT =
  "I had a reminder for your trip tomorrow but couldn't put the details together. Please ask me again about what to bring.";

/**
 * Internal: called from the Gemini tool loop once the model has resolved a
 * date. It is a mutation rather than an action because inserting the trip and
 * scheduling its reminder must not be able to happen separately — a trip with
 * no reminder is a silent broken promise.
 *
 * The date is validated here rather than trusted. It arrives from a model
 * resolving phrases like "September 11" or "next Friday", and "2026-02-30" is
 * exactly the sort of thing that comes back.
 */
export const saveTrip = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    destination: v.string(),
    tripDate: v.string(),
  },

  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const destination = args.destination
      .trim()
      .slice(0, MAX_DESTINATION_LENGTH);

    if (!destination) {
      return { saved: false, error: "I need to know where you're going." };
    }

    const now = Date.now();
    const plan = planTripReminder(args.tripDate, now);

    if (plan.kind === "invalid-date") {
      return { saved: false, error: plan.reason };
    }

    // Same trip mentioned twice in a conversation should not mean two
    // reminders. Matched on user + date + destination, which is what a person
    // would consider "the same trip".
    const existing = await ctx.db
      .query("trips")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", conversation.userId).eq("tripDate", args.tripDate),
      )
      .collect();

    const duplicate = existing.find(
      (trip) => trip.destination.toLowerCase() === destination.toLowerCase(),
    );

    if (duplicate) {
      return {
        saved: true,
        alreadySaved: true,
        destination,
        tripDate: args.tripDate,
        reminderSet: duplicate.remindAt !== undefined,
      };
    }

    if (existing.length >= MAX_ACTIVE_TRIPS) {
      return {
        saved: false,
        error: "That's a lot of trips for one day — I couldn't add another.",
      };
    }

    const tripId = await ctx.db.insert("trips", {
      userId: conversation.userId,
      conversationId: args.conversationId,
      destination,
      tripDate: args.tripDate,
      remindAt: plan.kind === "scheduled" ? plan.remindAtMs : undefined,
      createdAt: now,
    });

    if (plan.kind === "scheduled") {
      await ctx.scheduler.runAt(
        plan.remindAtMs,
        internal.trips.sendTripReminder,
        { tripId },
      );
    }

    return {
      saved: true,
      destination,
      tripDate: args.tripDate,
      reminderSet: plan.kind === "scheduled",
      // Given back to the model so it can be honest about it rather than
      // promising a reminder that was never scheduled.
      reminderNote:
        plan.kind === "scheduled"
          ? "A reminder will go out at 6pm the day before."
          : plan.reason,
    };
  },
});

export const getTrip = internalQuery({
  args: { tripId: v.id("trips") },

  handler: async (ctx, args): Promise<Doc<"trips"> | null> => {
    return await ctx.db.get(args.tripId);
  },
});

export const markReminderSent = internalMutation({
  args: { tripId: v.id("trips") },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, { reminderSentAt: Date.now() });
  },
});

/**
 * The day-before reminder.
 *
 * It regenerates the advice rather than replaying what was said when the trip
 * was booked, which may have been weeks earlier. That is the whole point: the
 * model re-runs its tools, so the reminder reflects tomorrow's actual forecast
 * — "rain has moved in since we spoke" is worth far more than a stored list.
 */
export const sendTripReminder = internalAction({
  args: { tripId: v.id("trips") },

  handler: async (ctx, args) => {
    const trip = await ctx.runQuery(internal.trips.getTrip, {
      tripId: args.tripId,
    });

    if (!trip) return;

    // Convex may retry a scheduled action; this makes a second run a no-op
    // rather than a second reminder.
    if (trip.reminderSentAt !== undefined) return;

    // The traveller may be mid-conversation right now. Two replies writing
    // into one thread interleave, and whichever finishes first clears the
    // other's lock — so wait rather than barge in. The lock self-expires
    // well inside the retry delay, so this cannot loop forever.
    const acquired = await ctx.runMutation(
      internal.conversations.tryAcquireReplyLock,
      { conversationId: trip.conversationId },
    );

    if (!acquired) {
      await ctx.scheduler.runAfter(
        REMINDER_RETRY_MS,
        internal.trips.sendTripReminder,
        { tripId: args.tripId },
      );

      return;
    }

    await ctx.runMutation(internal.trips.markReminderSent, {
      tripId: args.tripId,
    });

    const messageId = await ctx.runMutation(
      internal.messages.createStreamingMessage,
      { conversationId: trip.conversationId },
    );

    try {
      const healthConditions = await ctx.runQuery(
        internal.users.getHealthConditions,
        { userId: trip.userId },
      );

      const run = await runHealthTravelAssistant(
        ctx,
        trip.conversationId,
        healthConditions,
        async (adviceSoFar) => {
          await ctx.runMutation(internal.messages.updateStreamingMessage, {
            messageId,
            text: adviceSoFar,
          });
        },
        // Not stored as a user message — the traveller did not say this. It
        // exists only in the model's context for this one turn.
        `[Automatic reminder — the traveller has not asked anything just now.] They are travelling to ${trip.destination} tomorrow, ${trip.tripDate}. Check the current conditions there and remind them what to bring and what to watch out for, weighed against their health profile. Open by telling them the trip is tomorrow. Keep it short and practical, and mention anything that has changed since a forecast made earlier.`,
      );

      await ctx.runMutation(internal.messages.finishStreamingMessage, {
        messageId,
        text: run.response.advice,
        environmentalMetadata: buildEnvironmentalMetadata(
          run.environment,
          run.response.safetyVerdict,
        ),
        nearbyHospitals: run.hospitals,
        safePlaces: run.safePlaces,
        destinationPin: run.destinationPin,
      });

      await ctx.runAction(internal.push.sendTripPush, {
        userId: trip.userId,
        destination: trip.destination,
        advice: run.response.advice,
      });
    } catch (error) {
      console.error("Trip reminder failed:", error);

      await ctx.runMutation(internal.messages.failMessage, {
        messageId,
        fallbackText: REMINDER_FAILURE_TEXT,
      });
    }
  },
});
