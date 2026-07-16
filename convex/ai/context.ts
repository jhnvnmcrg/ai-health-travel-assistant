import { Content } from "@google/genai";

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
