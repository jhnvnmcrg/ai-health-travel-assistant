import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { buildGeminiContents, appendToolResults } from "./context";
import { generateChatResponse } from "./generate";
import { parseAIResponse } from "./parseResponse";
import type { AIResponse } from "./types";
import { toolRegistry } from "./toolRegistry";

const MAX_TOOL_ROUNDS = 4;

export async function runHealthTravelAssistant(
  ctx: ActionCtx,
  conversationId: string,
): Promise<AIResponse> {
  const history = await ctx.runQuery(api.messages.getConversationContext, {
    conversationId: conversationId as any,
  });

  let contents = buildGeminiContents(history);
  let response = await generateChatResponse(contents);
  let rounds = 0;

  while (true) {
    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length === 0) {
      break;
    }

    rounds += 1;
    if (rounds > MAX_TOOL_ROUNDS) {
      throw new Error("The AI made too many tool calls without finishing.");
    }

    const results: { name: string; result: unknown }[] = [];

    for (const functionCall of functionCalls) {
      if (!functionCall?.name) continue;

      const toolName = functionCall.name;
      const tool = toolRegistry[toolName];

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const toolResult = await tool(
        ctx,
        (functionCall.args ?? {}) as Record<string, unknown>,
      );

      results.push({ name: toolName, result: toolResult });
    }

    contents = appendToolResults(contents, response, results);
    response = await generateChatResponse(contents);
  }

  return parseAIResponse(response.text ?? "");
}
