import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const buildConversationContext = action({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args): Promise<{ role: string; text: string }[]> => {
    const messages = await ctx.runQuery(api.messages.getConversationContext, {
      conversationId: args.conversationId,
    });

    return messages;
  },
});
