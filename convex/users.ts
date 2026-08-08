import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthedUser, requireIdentity, requireUser } from "./lib/auth";

/** Keeps a runaway paste out of every system instruction from then on. */
const MAX_CONDITIONS = 20;
const MAX_CONDITION_LENGTH = 80;

/**
 * Upsert the Convex row for the signed-in Clerk user.
 *
 * `clerkUserId` comes from the verified JWT (`identity.subject`), never from an
 * argument, so a caller cannot write to somebody else's row. Called from
 * app/(protected)/_layout.tsx, which every authenticated route passes through.
 */
export const syncUser = mutation({
  args: {
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const clerkUserId = identity.subject;
    const email = identity.email ?? args.email ?? "";
    const displayName = args.displayName ?? identity.name;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: email || existing.email,
        displayName: displayName ?? existing.displayName,
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId,
      email,
      displayName,

      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    return await getAuthedUser(ctx);
  },
});

/**
 * The conditions the assistant should weigh on every turn, whether or not the
 * current messages mention them. Written from the health profile sheet in
 * components/HealthProfileSheet.tsx.
 */
export const updateHealthConditions = mutation({
  args: {
    healthConditions: v.array(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const seen = new Set<string>();
    const healthConditions: string[] = [];

    for (const raw of args.healthConditions) {
      const condition = raw.trim().slice(0, MAX_CONDITION_LENGTH);
      const key = condition.toLowerCase();

      if (condition === "" || seen.has(key)) {
        continue;
      }

      seen.add(key);
      healthConditions.push(condition);

      if (healthConditions.length >= MAX_CONDITIONS) {
        break;
      }
    }

    await ctx.db.patch(user._id, {
      healthConditions,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal: convex/chat.ts runs scheduled, with no caller identity, so it
 * looks the profile up by the conversation's owner.
 */
export const getHealthConditions = internalQuery({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args): Promise<string[]> => {
    const user = await ctx.db.get(args.userId);

    return user?.healthConditions ?? [];
  },
});
