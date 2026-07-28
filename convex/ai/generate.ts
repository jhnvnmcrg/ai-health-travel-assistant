import { Content } from "@google/genai";
import { gemini } from "./client";
import { SYSTEM_PROMPT } from "./systemPrompt";
import { environmentTool } from "./tools";
import { hospitalTool } from "./hospitalTool";

export async function generateChatResponse(history: Content[]) {
  const MAX_RETRIES = 3;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await gemini.models.generateContent({
        model: "gemini-3.5-flash-lite",
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [
            {
              functionDeclarations: [environmentTool, hospitalTool],
            },
          ],
        },

        contents: history,
      });
    } catch (error) {
      lastError = error;

      console.warn(`Gemini attempt ${attempt} failed.`, error);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  throw lastError;
}
