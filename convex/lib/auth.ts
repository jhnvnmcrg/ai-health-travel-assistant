import type { UserIdentity } from "convex/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

/**
 * Every function in this file derives identity from the Clerk JWT that Convex
 * verified (`ctx.auth`) — never from a client-supplied id.
 *
 * Convention in this codebase:
 * - mutations and actions throw when the caller is not the owner
 * - queries degrade to empty/null instead of throwing, so a deleted or stale
 *   document cannot crash a subscribed component
 */

export async function requireIdentity(ctx: Ctx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Not authenticated.");
  }

  return identity;
}

export async function getAuthedUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  await requireIdentity(ctx);

  const user = await getAuthedUser(ctx);

  if (!user) {
    throw new Error("No user record for this account yet.");
  }

  return user;
}

export async function requireConversation(
  ctx: Ctx,
  conversationId: Id<"conversations">,
): Promise<{ user: Doc<"users">; conversation: Doc<"conversations"> }> {
  const user = await requireUser(ctx);
  const conversation = await ctx.db.get(conversationId);

  // Same error for missing and not-owned, so this cannot be used to probe
  // which conversation ids exist.
  if (!conversation || conversation.userId !== user._id) {
    throw new Error("Conversation not found.");
  }

  return { user, conversation };
}

export async function getOwnedConversation(
  ctx: Ctx,
  conversationId: Id<"conversations">,
): Promise<Doc<"conversations"> | null> {
  const user = await getAuthedUser(ctx);

  if (!user) {
    return null;
  }

  const conversation = await ctx.db.get(conversationId);

  if (!conversation || conversation.userId !== user._id) {
    return null;
  }

  return conversation;
}
