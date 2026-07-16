import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

import { buildGeminiContents, appendToolResult } from "./ai/context";
import { generateChatResponse } from "./ai/generate";
import { generateChatResponseWithToolResult } from "./ai/generateWithToolResult";

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

    const response = await generateChatResponse(contents);

    const functionCall = response.functionCalls?.[0];

    let finalText = response.text ?? "No response generated.";

    if (
      functionCall?.name === "fetch_location_environment_data" &&
      functionCall.args &&
      typeof functionCall.args.location === "string"
    ) {
      const environment = await ctx.runAction(
        api.environment.fetchLocationEnvironmentData,
        {
          location: functionCall.args.location,
        },
      );

      const updatedHistory = appendToolResult(
        contents,
        functionCall.name,
        environment,
      );

      const finalResponse =
        await generateChatResponseWithToolResult(updatedHistory);

      finalText = finalResponse.text ?? "No response generated.";
    }

    let assistantText = finalText;
    let environmentalMetadata;

    try {
      const parsed = JSON.parse(finalText);

      assistantText = parsed.advice;

      environmentalMetadata = {
        latitude: parsed.environmentalMetadata.latitude,
        longitude: parsed.environmentalMetadata.longitude,
        altitude: parsed.environmentalMetadata.altitude,
        temperature: parsed.environmentalMetadata.temperature,
        humidity: parsed.environmentalMetadata.humidity,
        windSpeed: parsed.environmentalMetadata.windSpeed,
        pm25: parsed.environmentalMetadata.pm25,
        pm10: parsed.environmentalMetadata.pm10,
        safetyVerdict: parsed.safetyVerdict,
      };
    } catch {
      console.warn("Gemini returned non-JSON response.");
    }

    await ctx.runMutation(api.messages.createAssistantMessage, {
      conversationId: args.conversationId,
      text: assistantText,
      environmentalMetadata,
    });
  },
});
