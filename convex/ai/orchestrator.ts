import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { EnvironmentReading } from "../services/environmentService";
import {
  appendToolResults,
  buildGeminiContents,
  modelTurnFromCalls,
} from "./context";
import { generateChatTurn } from "./generate";
import { parseAIResponse } from "./parseResponse";
import { buildSystemInstruction } from "./systemPrompt";
import type { AIResponse, Hospital } from "./types";
import { toolRegistry } from "./toolRegistry";

const MAX_TOOL_ROUNDS = 4;
const ENVIRONMENT_TOOL = "fetch_location_environment_data";
const HOSPITAL_TOOL = "search_nearby_hospitals";

/**
 * ~2km. This compares one tool's output against another tool's arguments, so
 * the only drift it has to absorb is the model rounding the coordinates it
 * relays between them.
 */
const HOSPITAL_ORIGIN_TOLERANCE = 0.02;

type Coordinates = { latitude: number; longitude: number };

type HospitalSearch = {
  origin: Coordinates;
  hospitals: Hospital[];
};

export type AssistantRun = {
  response: AIResponse;
  /**
   * Captured from the tool results, not from the model's reply. Present only
   * when this turn resolved exactly one place — see `pickEnvironment`.
   */
  environment?: EnvironmentReading;
  hospitals?: Hospital[];
};

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readEnvironmentReading(result: unknown): EnvironmentReading | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;

  const latitude = readNumber(record.latitude);
  const longitude = readNumber(record.longitude);

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    locationName:
      typeof record.locationName === "string" ? record.locationName.trim() : "",
    latitude,
    longitude,
    altitude: readNumber(record.altitude),
    temperature: readNumber(record.temperature),
    humidity: readNumber(record.humidity),
    windSpeed: readNumber(record.windSpeed),
    uvIndex: readNumber(record.uvIndex),
    rainProbability: readNumber(record.rainProbability),
    heatIndex: readNumber(record.heatIndex),
    pm25: readNumber(record.pm25),
    pm10: readNumber(record.pm10),
  };
}

function readHospitals(result: unknown): Hospital[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const list = (result as Record<string, unknown>).hospitals;

  if (!Array.isArray(list)) {
    return [];
  }

  return list.flatMap((entry): Hospital[] => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const record = entry as Record<string, unknown>;

    const latitude = readNumber(record.latitude);
    const longitude = readNumber(record.longitude);

    if (latitude === undefined || longitude === undefined) {
      return [];
    }

    const name =
      typeof record.name === "string" && record.name.trim() !== ""
        ? record.name.trim()
        : "Unnamed Hospital";

    return [{ name, latitude, longitude }];
  });
}

/**
 * A reply carries one metric strip, so it can only be labelled when the turn
 * resolved exactly one place. Asking about two destinations at once used to
 * show one place's numbers beneath advice covering both; the coordinate-matching
 * heuristic this replaces could only guess at which, because the numbers came
 * back through the model. Showing nothing is the honest outcome.
 */
function pickEnvironment(
  readings: EnvironmentReading[],
): EnvironmentReading | undefined {
  return readings.length === 1 ? readings[0] : undefined;
}

function pickHospitals(
  searches: HospitalSearch[],
  environment: EnvironmentReading | undefined,
): Hospital[] | undefined {
  if (searches.length !== 1) {
    return undefined;
  }

  const [search] = searches;

  if (search.hospitals.length === 0) {
    return undefined;
  }

  // The UI measures distances from the environmental reading, so a search the
  // model ran against different coordinates cannot be shown against it.
  if (
    environment &&
    (Math.abs(search.origin.latitude - environment.latitude) >
      HOSPITAL_ORIGIN_TOLERANCE ||
      Math.abs(search.origin.longitude - environment.longitude) >
        HOSPITAL_ORIGIN_TOLERANCE)
  ) {
    console.warn(
      "Hospital search coordinates disagree with the resolved location; " +
        "dropping the hospital list rather than showing unmeasurable distances.",
    );

    return undefined;
  }

  return search.hospitals;
}

export async function runHealthTravelAssistant(
  ctx: ActionCtx,
  conversationId: Id<"conversations">,
  healthConditions: string[],
  onAdvice?: (adviceSoFar: string) => Promise<void>,
): Promise<AssistantRun> {
  const history = await ctx.runQuery(internal.messages.getConversationContext, {
    conversationId,
  });

  const systemInstruction = buildSystemInstruction(healthConditions);

  let contents = buildGeminiContents(history);
  let rounds = 0;

  const readings: EnvironmentReading[] = [];
  const searches: HospitalSearch[] = [];

  while (true) {
    const turn = await generateChatTurn(contents, systemInstruction, onAdvice);

    if (turn.functionCalls.length === 0) {
      const environment = pickEnvironment(readings);

      return {
        response: parseAIResponse(turn.text),
        environment,
        hospitals: pickHospitals(searches, environment),
      };
    }

    rounds += 1;

    if (rounds > MAX_TOOL_ROUNDS) {
      throw new Error("The AI made too many tool calls without finishing.");
    }

    const results: { name: string; result: unknown }[] = [];

    for (const functionCall of turn.functionCalls) {
      if (!functionCall.name) continue;

      const toolName = functionCall.name;
      const tool = toolRegistry[toolName];

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      const args = (functionCall.args ?? {}) as Record<string, unknown>;
      const result = await tool(ctx, args);

      // Everything the UI shows is captured here, straight off the tool
      // result. The model's own reply is never read for these numbers.
      if (toolName === ENVIRONMENT_TOOL) {
        const reading = readEnvironmentReading(result);

        if (reading) {
          readings.push(reading);
        }
      } else if (toolName === HOSPITAL_TOOL) {
        const latitude = readNumber(args.latitude);
        const longitude = readNumber(args.longitude);

        if (latitude !== undefined && longitude !== undefined) {
          searches.push({
            origin: { latitude, longitude },
            hospitals: readHospitals(result),
          });
        }
      }

      results.push({ name: toolName, result });
    }

    contents = appendToolResults(
      contents,
      modelTurnFromCalls(turn.functionCalls),
      results,
    );
  }
}
