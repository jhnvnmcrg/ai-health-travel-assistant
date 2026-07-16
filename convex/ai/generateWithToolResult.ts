import { Content, GenerateContentResponse } from "@google/genai";

import { gemini } from "./client";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { environmentTool } from "./tools";

export async function generateChatResponseWithToolResult(
  history: Content[],
): Promise<GenerateContentResponse> {
  return await gemini.models.generateContent({
    model: "gemini-2.5-flash",

    config: {
      systemInstruction: SYSTEM_PROMPT,

      tools: [
        {
          functionDeclarations: [environmentTool],
        },
      ],
    },

    contents: history,
  });
}
