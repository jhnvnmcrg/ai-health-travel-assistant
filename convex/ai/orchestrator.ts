import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { buildGeminiContents, appendToolResults } from "./context";
import { generateChatResponse } from "./generate";
import { parseAIResponse } from "./parseResponse";
import type { AIResponse } from "./types";
import { toolRegistry } from "./toolRegistry";

const MAX_TOOL_ROUNDS = 4;
const ENVIRONMENT_TOOL = "fetch_location_environment_data";

export type ResolvedLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

export type AssistantRun = {
  response: AIResponse;
  /**
   * Every place the environment tool resolved during this turn, straight from
   * the geocoder. convex/chat.ts matches these against the coordinates the
   * model reported so a reply can't be labelled with the wrong place.
   */
  locations: ResolvedLocation[];
};

function readResolvedLocation(result: unknown): ResolvedLocation | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const { locationName, latitude, longitude } = result as Record<
    string,
    unknown
  >;

  if (
    typeof locationName !== "string" ||
    locationName === "" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return null;
  }

  return { name: locationName, latitude, longitude };
}

export async function runHealthTravelAssistant(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
): Promise<AssistantRun> {
  const history = await ctx.runQuery(
    internal.messages.getConversationContext,
    { conversationId },
  );

  let contents = buildGeminiContents(history);
  let response = await generateChatResponse(contents);
  let rounds = 0;

  const locations: ResolvedLocation[] = [];

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

      if (toolName === ENVIRONMENT_TOOL) {
        const resolved = readResolvedLocation(toolResult);

        if (resolved) {
          locations.push(resolved);
        }
      }

      results.push({ name: toolName, result: toolResult });
    }

    contents = appendToolResults(contents, response, results);
    response = await generateChatResponse(contents);
  }

  return {
    response: parseAIResponse(response.text ?? ""),
    locations,
  };
}
