import { Content } from "@google/genai";

import { gemini } from "./client";
import { SYSTEM_PROMPT } from "./systemPrompt";

export async function generateChatResponse(
  history: Content[],
): Promise<string> {
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",

    config: {
      systemInstruction: SYSTEM_PROMPT,
    },

    contents: history,
  });

  return response.text ?? "I'm sorry, I couldn't generate a response.";
}
