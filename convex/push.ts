import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

const REQUEST_TIMEOUT_MS = 10000;

/** Notification bodies are a glance, not a briefing. */
const BODY_LIMIT = 140;

export const getPushToken = internalQuery({
  args: { userId: v.id("users") },

  handler: async (ctx, args): Promise<string | null> => {
    const user = await ctx.db.get(args.userId);

    return user?.pushToken ?? null;
  },
});

/**
 * Trims the generated advice into something readable on a lock screen.
 *
 * Cuts at a sentence end where one is close to the limit, so the notification
 * does not stop mid-clause. The full advice is already in the conversation, so
 * this is a teaser rather than the content.
 */
function toNotificationBody(advice: string): string {
  const flat = advice.replace(/\s+/g, " ").trim();

  if (flat.length <= BODY_LIMIT) {
    return flat;
  }

  const clipped = flat.slice(0, BODY_LIMIT);
  const lastStop = Math.max(
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("! "),
  );

  if (lastStop > BODY_LIMIT * 0.5) {
    return clipped.slice(0, lastStop + 1);
  }

  return `${clipped.trimEnd()}…`;
}

/**
 * Sends the trip reminder as a push notification, if we have a token.
 *
 * Best-effort by design: the reminder has already been written into the
 * conversation by the time this runs, so a missing token, a declined
 * permission, or an Expo outage costs the notification and nothing else. It
 * never throws — convex/trips.ts must not lose a delivered reminder because
 * the push leg failed.
 */
export const sendTripPush = internalAction({
  args: {
    userId: v.id("users"),
    destination: v.string(),
    advice: v.string(),
  },

  handler: async (ctx, args) => {
    const token = await ctx.runQuery(internal.push.getPushToken, {
      userId: args.userId,
    });

    // No token is the normal case on web, and whenever notifications were
    // declined. Not a failure.
    if (!token) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: token,
          title: `Trip tomorrow: ${args.destination}`,
          body: toNotificationBody(args.advice),
          sound: "default",
          priority: "high",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(
          `Expo push responded with HTTP ${response.status}; the in-app reminder still landed.`,
        );
        return;
      }

      const result = await response.json();
      const ticket = result?.data;

      // A DeviceNotRegistered ticket means the app was uninstalled or the
      // token was rotated. Clearing it stops us pushing at nothing forever.
      if (ticket?.status === "error") {
        console.warn("Expo push ticket error:", ticket.message, ticket.details);

        if (ticket?.details?.error === "DeviceNotRegistered") {
          await ctx.runMutation(internal.push.clearPushToken, {
            userId: args.userId,
          });
        }
      }
    } catch (error) {
      console.warn("Failed to send trip push notification:", error);
    } finally {
      clearTimeout(timeout);
    }
  },
});

export const clearPushToken = internalMutation({
  args: { userId: v.id("users") },

  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { pushToken: undefined });
  },
});
