import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

import { runHealthTravelAssistant } from "./ai/orchestrator";
import { generateConversationTitle } from "./ai/generateConversationTitle";
import type { EnvironmentReading } from "./services/environmentService";
import type { SafetyVerdict } from "./ai/types";

const FAILURE_TEXT =
  "Sorry — I couldn't put together travel health advice just now. Please send your message again in a moment.";

/**
 * The stored metadata is the tool's own reading plus the verdict the model
 * reached about it. `locationName` is dropped when the geocoder gave nothing
 * usable rather than stored empty.
 */
function buildEnvironmentalMetadata(
  environment: EnvironmentReading | undefined,
  safetyVerdict: SafetyVerdict,
) {
  if (!environment) {
    return undefined;
  }

  const { locationName, ...reading } = environment;

  return {
    ...reading,
    ...(locationName ? { locationName } : {}),
    safetyVerdict,
  };
}

/**
 * Internal, and scheduled by `messages.createMessage` once that mutation has
 * verified the caller owns the conversation. It is unreachable from a client,
 * so there is no ownership check to repeat here.
 */
export const processUserMessage = internalAction({
  args: {
    conversationId: v.id("conversations"),
  },

  handler: async (ctx, args) => {
    // Created before generation starts, so the placeholder appears while the
    // tools are still running rather than after them.
    const messageId = await ctx.runMutation(
      internal.messages.createStreamingMessage,
      { conversationId: args.conversationId },
    );

    try {
      const conversation = await ctx.runQuery(internal.conversations.getById, {
        conversationId: args.conversationId,
      });

      if (!conversation) {
        throw new Error("Conversation not found.");
      }

      if (!conversation.title) {
        // Best-effort: a conversation without a title is cosmetic, and not a
        // reason to fail the reply the user is waiting for.
        try {
          const firstMessage = await ctx.runQuery(
            internal.messages.getFirstUserMessageText,
            { conversationId: args.conversationId },
          );

          if (firstMessage) {
            await ctx.runMutation(internal.conversations.updateTitle, {
              conversationId: args.conversationId,
              title: await generateConversationTitle(firstMessage),
            });
          }
        } catch (error) {
          console.warn("Failed to generate conversation title:", error);
        }
      }

      const healthConditions = await ctx.runQuery(
        internal.users.getHealthConditions,
        { userId: conversation.userId },
      );

      const run = await runHealthTravelAssistant(
        ctx,
        args.conversationId,
        healthConditions,
        async (adviceSoFar) => {
          await ctx.runMutation(internal.messages.updateStreamingMessage, {
            messageId,
            text: adviceSoFar,
          });
        },
      );

      await ctx.runMutation(internal.messages.finishStreamingMessage, {
        messageId,
        text: run.response.advice,
        environmentalMetadata: buildEnvironmentalMetadata(
          run.environment,
          run.response.safetyVerdict,
        ),
        nearbyHospitals: run.hospitals,
      });
    } catch (error) {
      // A failing tool (geocode miss, Open-Meteo outage) or an exhausted Gemini
      // retry leaves a visible row rather than an unanswered message.
      console.error("Health travel assistant failed:", error);

      await ctx.runMutation(internal.messages.failMessage, {
        messageId,
        fallbackText: FAILURE_TEXT,
      });
    }
  },
});
