import { Content, FunctionCall } from "@google/genai";

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

/**
 * Rebuilds the model's tool-calling turn from the calls that were streamed out
 * of it. The turn has to go back into the history before the results, or the
 * model sees answers to questions it has no record of asking.
 */
export function modelTurnFromCalls(functionCalls: FunctionCall[]): Content {
  return {
    role: "model",
    parts: functionCalls.map((functionCall) => ({ functionCall })),
  };
}

export function appendToolResults(
  history: Content[],
  modelTurn: Content,
  results: { name: string; result: unknown }[],
): Content[] {
  const functionResponseTurn: Content = {
    role: "user",
    parts: results.map(({ name, result }) => ({
      functionResponse: {
        name,
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
