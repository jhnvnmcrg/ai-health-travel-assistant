import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const processUserMessage = action({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const reply = await ctx.runAction(api.ai.generateResponse, {
      prompt: args.text,
    });

    await ctx.runMutation(api.messages.createAssistantMessage, {
      conversationId: args.conversationId,
      text: reply,
    });
  },
});
