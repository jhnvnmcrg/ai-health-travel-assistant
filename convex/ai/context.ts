import { Content, Part } from "@google/genai";

type ContextMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ToolResult = {
  name: string;
  /**
   * The id of the call this answers, when the model supplied one. Echoing it
   * back is how two parallel calls to the same tool — "compare Baguio and
   * Davao" — are told apart, since matching on name alone cannot.
   */
  id?: string;
  result: unknown;
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
  modelParts: Part[],
  results: ToolResult[],
): Content[] {
  /**
   * The model's turn goes back **verbatim**.
   *
   * Gemini 3 attaches an opaque `thoughtSignature` to function-call parts, and
   * it sits on the Part rather than on the `FunctionCall` inside it. Rebuilding
   * this turn from the FunctionCall objects loses the signature and the API
   * rejects the follow-up request outright:
   *
   *   400 Function call is missing a thought_signature in functionCall parts.
   *
   * So: never reconstruct, only replay.
   */
  const modelTurn: Content = { role: "model", parts: modelParts };

  const functionResponseTurn: Content = {
    role: "user",
    parts: results.map(({ name, id, result }) => ({
      functionResponse: {
        name,
        ...(id ? { id } : {}),
        response:
          result !== null &&
          typeof result === "object" &&
          !Array.isArray(result)
            ? (result as Record<string, unknown>)
            : { result },
      },
    })),
  };

  return [...history, modelTurn, functionResponseTurn];
}
