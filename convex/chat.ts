import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

import {
  runHealthTravelAssistant,
  type ResolvedLocation,
} from "./ai/orchestrator";
import { generateConversationTitle } from "./ai/generateConversationTitle";

/** ~5km — loose enough to survive the model rounding the coordinates it echoes. */
const COORDINATE_TOLERANCE = 0.05;

/**
 * Names the reply's coordinates using what the geocoder actually resolved. With
 * several lookups in one turn the coordinates have to agree, otherwise the name
 * is dropped — a wrong place name on health advice is worse than none.
 */
function resolveLocationName(
  locations: ResolvedLocation[],
  metadata: { latitude: number; longitude: number } | undefined,
): string | undefined {
  if (!metadata || locations.length === 0) {
    return undefined;
  }

  if (locations.length === 1) {
    return locations[0].name;
  }

  const match = locations.find(
    (location) =>
      Math.abs(location.latitude - metadata.latitude) < COORDINATE_TOLERANCE &&
      Math.abs(location.longitude - metadata.longitude) < COORDINATE_TOLERANCE,
  );

  return match?.name;
}

// The reply is fully generated before this loop starts, so the "streaming" is
// cosmetic. Each chunk is a separate mutation — keep the chunk coarse so a long
// reply costs tens of writes rather than hundreds.
const CHUNK_SIZE = 40;
const CHUNK_DELAY_MS = 40;

const FAILURE_TEXT =
  "Sorry — I couldn't put together travel health advice just now. Please send your message again in a moment.";

export const processUserMessage = action({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },

  handler: async (ctx, args) => {
    // Ownership gate: this throws unless the signed-in user owns the
    // conversation. Everything below runs through internal mutations, which
    // skip their own checks because of it.
    const conversation = await ctx.runQuery(api.conversations.getConversation, {
      conversationId: args.conversationId,
    });

    if (!conversation.title) {
      try {
        const title = await generateConversationTitle(args.text);

        await ctx.runMutation(internal.conversations.updateTitle, {
          conversationId: args.conversationId,
          title,
        });
      } catch (error) {
        console.warn("Failed to generate conversation title:", error);
      }
    }

    let assistantText: string;
    let environmentalMetadata;
    let nearbyHospitals;

    try {
      const { response: aiResponse, locations } =
        await runHealthTravelAssistant(ctx, args.conversationId);

      assistantText = aiResponse.advice;

      const locationName = resolveLocationName(
        locations,
        aiResponse.environmentalMetadata,
      );

      environmentalMetadata = aiResponse.environmentalMetadata
        ? {
            ...aiResponse.environmentalMetadata,
            safetyVerdict: aiResponse.safetyVerdict,
            ...(locationName ? { locationName } : {}),
          }
        : undefined;

      nearbyHospitals = aiResponse.nearbyHospitals ?? undefined;
    } catch (error) {
      // A failing tool (geocode miss, Open-Meteo outage) or an exhausted Gemini
      // retry used to abort silently, leaving the user's message unanswered.
      console.error("Health travel assistant failed:", error);

      await ctx.runMutation(internal.messages.createErrorMessage, {
        conversationId: args.conversationId,
        text: FAILURE_TEXT,
      });

      return;
    }

    const streamingMessageId = await ctx.runMutation(
      internal.messages.createStreamingMessage,
      {
        conversationId: args.conversationId,
      },
    );

    try {
      for (let i = 0; i < assistantText.length; i += CHUNK_SIZE) {
        const chunk = assistantText.slice(i, i + CHUNK_SIZE);

        await ctx.runMutation(internal.messages.appendToStreamingMessage, {
          messageId: streamingMessageId,
          textChunk: chunk,
        });

        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
      }

      await ctx.runMutation(internal.messages.finishStreamingMessage, {
        messageId: streamingMessageId,
        environmentalMetadata,
        nearbyHospitals,
      });
    } catch (error) {
      console.error("Failed while writing the assistant reply:", error);

      await ctx.runMutation(internal.messages.failMessage, {
        messageId: streamingMessageId,
        fallbackText: FAILURE_TEXT,
      });
    }
  },
});
