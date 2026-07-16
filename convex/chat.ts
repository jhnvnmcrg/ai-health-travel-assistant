import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

import { buildGeminiContents } from "./ai/context";
import { generateChatResponse } from "./ai/generate";

export const processUserMessage = action({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const history = await ctx.runQuery(api.messages.getConversationContext, {
      conversationId: args.conversationId,
    });

    const contents = buildGeminiContents(history);

    const reply = await generateChatResponse(contents);

    await ctx.runMutation(api.messages.createAssistantMessage, {
      conversationId: args.conversationId,
      text: reply,
    });
  },
});
