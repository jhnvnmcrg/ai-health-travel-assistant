import { Content, GenerateContentResponse } from "@google/genai";

type ContextMessage = {
  role: "user" | "assistant";
  text: string;
};

export function buildGeminiContents(history: ContextMessage[]): Content[] {
  return history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text: message.text,
      },
    ],
  }));
}


export function appendToolResults(
  history: Content[],
  modelResponse: GenerateContentResponse,
  results: { name: string; result: unknown }[],
): Content[] {
  const modelTurn = modelResponse.candidates?.[0]?.content;

  const functionResponseTurn: Content = {
    role: "user",
    parts: results.map(({ name, result }) => ({
      functionResponse: {
        name,
        response:
          result !== null && typeof result === "object" && !Array.isArray(result)
            ? (result as Record<string, unknown>)
            : { result },
      },
    })),
  };

  return [...history, ...(modelTurn ? [modelTurn] : []), functionResponseTurn];
}
