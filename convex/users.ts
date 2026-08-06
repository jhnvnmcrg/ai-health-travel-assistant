import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthedUser, requireIdentity } from "./lib/auth";

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
