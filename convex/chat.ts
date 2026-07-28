import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

import { runHealthTravelAssistant } from "./ai/orchestrator";
import { generateConversationTitle } from "./ai/generateConversationTitle";

const CHUNK_SIZE = 6;
const CHUNK_DELAY_MS = 25;

export const processUserMessage = action({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    const conversation = await ctx.runQuery(api.conversations.getConversation, {
      conversationId: args.conversationId,
    });

    if (!conversation?.title) {
      try {
        const title = await generateConversationTitle(args.text);

        await ctx.runMutation(api.conversations.updateTitle, {
          conversationId: args.conversationId,
          title,
        });
      } catch (error) {
        console.warn("Failed to generate conversation title:", error);
      }
    }

    const aiResponse = await runHealthTravelAssistant(
      ctx,
      args.conversationId as any,
    );

    const assistantText = aiResponse.advice;

    const environmentalMetadata = aiResponse.environmentalMetadata
      ? {
          ...aiResponse.environmentalMetadata,
          safetyVerdict: aiResponse.safetyVerdict || "Safe",
        }
      : undefined;

    const streamingMessageId = await ctx.runMutation(
      api.messages.createStreamingMessage,
      {
        conversationId: args.conversationId,
      },
    );

    for (let i = 0; i < assistantText.length; i += CHUNK_SIZE) {
      const chunk = assistantText.slice(i, i + CHUNK_SIZE);

      await ctx.runMutation(api.messages.appendToStreamingMessage, {
        messageId: streamingMessageId,
        textChunk: chunk,
      });

      await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
    }

    await ctx.runMutation(api.messages.finishStreamingMessage, {
      messageId: streamingMessageId,
      environmentalMetadata,
      nearbyHospitals: aiResponse.nearbyHospitals ?? undefined,
    });
  },
});
