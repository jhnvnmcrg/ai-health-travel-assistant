import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { EnvironmentReading } from "../services/environmentService";
import {
  appendToolResults,
  buildGeminiContents,
  type ToolResult,
} from "./context";
import { generateChatTurn } from "./generate";
import { parseAIResponse } from "./parseResponse";
import { buildSystemInstruction } from "./systemPrompt";
import type { AIResponse, Hospital } from "./types";
import { toolRegistry } from "./toolRegistry";
import { pickDestinationPin } from "./attribution";

const MAX_TOOL_ROUNDS = 4;
const ENVIRONMENT_TOOL = "fetch_location_environment_data";
const HOSPITAL_TOOL = "search_nearby_hospitals";
const SAFE_PLACES_TOOL = "find_safe_places";
const DESTINATION_TOOL = "show_destination_on_map";

/**
 * ~2km. This compares one tool's output against another tool's arguments, so
 * the only drift it has to absorb is the model rounding the coordinates it
 * relays between them.
 */
const HOSPITAL_ORIGIN_TOLERANCE = 0.02;

/** Used when a tool throws something that isn't an Error. */
const TOOL_FAILURE_TEXT = "The lookup failed.";

type Coordinates = { latitude: number; longitude: number };

type HospitalSearch = {
  origin: Coordinates;
  hospitals: Hospital[];
};

export type SafePlace = {
  name: string;
  category: "town" | "police" | "hospital" | "transport";
  latitude: number;
  longitude: number;
};

export type SafePlacesResult = {
  origin: Coordinates;
  places: SafePlace[];
};

/** One end of a journey, as the geocoder resolved it. */
export type PinEnd = {
  name: string;
  /** The administrative trail — "Baguio, Benguet". */
  label?: string;
  latitude: number;
  longitude: number;
};

export type DestinationPin = {
  destination: PinEnd & {
    /** What the traveller called it, when they named it rather than pinning it. */
    query?: string;
  };
  origin?: PinEnd;
};

export type AssistantRun = {
  response: AIResponse;
  /**
   * Captured from the tool results, not from the model's reply. Present only
   * when this turn resolved exactly one place — see `pickEnvironment`.
   */
  environment?: EnvironmentReading;
  hospitals?: Hospital[];
  /**
   * Destinations for a lost traveller, with the coordinate they were searched
   * from. Self-contained on purpose: someone lost has no place name to
   * geocode, so this cannot lean on `environment` for its origin.
   */
  safePlaces?: SafePlacesResult;
  /**
   * Somewhere the traveller asked the way to. A pin, never a path — nothing in
   * this app produces a route.
   */
  destinationPin?: DestinationPin;
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

const SAFE_PLACE_CATEGORIES = ["town", "police", "hospital", "transport"];

function readSafePlaces(
  result: unknown,
  args: Record<string, unknown>,
): SafePlacesResult | null {
  const latitude = readNumber(args.latitude);
  const longitude = readNumber(args.longitude);

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  const list = (result as { places?: unknown } | null)?.places;

  if (!Array.isArray(list)) {
    return null;
  }

  const places = list.flatMap((entry): SafePlace[] => {
    if (!entry || typeof entry !== "object") return [];

    const record = entry as Record<string, unknown>;
    const placeLat = readNumber(record.latitude);
    const placeLon = readNumber(record.longitude);
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const category = record.category;

    if (
      placeLat === undefined ||
      placeLon === undefined ||
      name === "" ||
      typeof category !== "string" ||
      !SAFE_PLACE_CATEGORIES.includes(category)
    ) {
      return [];
    }

    return [
      {
        name,
        category: category as SafePlace["category"],
        latitude: placeLat,
        longitude: placeLon,
      },
    ];
  });

  return { origin: { latitude, longitude }, places };
}

function readPinEnd(value: unknown): PinEnd | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  const latitude = readNumber(record.latitude);
  const longitude = readNumber(record.longitude);

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  const label = typeof record.label === "string" ? record.label.trim() : "";

  // The geocoder's own strings, both allowed to be empty — a reverse lookup
  // that found no name still leaves a usable point, and the card falls back to
  // showing coordinates.
  return {
    name: typeof record.name === "string" ? record.name.trim() : "",
    ...(label ? { label } : {}),
    latitude,
    longitude,
  };
}

/**
 * Read from the tool's RESULT rather than its arguments, unlike
 * `readSafePlaces` above. The arguments may be place names; only the result
 * carries the point the geocoder actually matched, along with the province
 * that lets the traveller tell it is the right one.
 */
function readDestinationPin(result: unknown): DestinationPin | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;

  const destination = readPinEnd(record.destination);

  if (!destination) {
    return null;
  }

  const rawDestination = record.destination as Record<string, unknown>;
  const query =
    typeof rawDestination.query === "string" ? rawDestination.query.trim() : "";

  const origin = readPinEnd(record.origin);

  return {
    destination: { ...destination, ...(query ? { query } : {}) },
    ...(origin ? { origin } : {}),
  };
}

/**
 * One card, so one search. Two `find_safe_places` calls in a turn would mean
 * two different origins, and a card that measures distances from the wrong one
 * is worse than no card for somebody trying to walk to safety.
 */
function pickSafePlaces(
  searches: SafePlacesResult[],
): SafePlacesResult | undefined {
  if (searches.length !== 1) return undefined;

  return searches[0].places.length > 0 ? searches[0] : undefined;
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
  /**
   * An instruction appended as a final user turn for this generation only.
   *
   * Used by the trip reminder in convex/trips.ts, which has to prompt a reply
   * when the traveller has not asked anything. It is never written to the
   * database — inventing a user message they did not send would corrupt the
   * transcript and be replayed as fact on every later turn.
   */
  extraUserTurn?: string,
): Promise<AssistantRun> {
  const history = await ctx.runQuery(internal.messages.getConversationContext, {
    conversationId,
  });

  const systemInstruction = buildSystemInstruction(healthConditions);

  let contents = buildGeminiContents(history);

  if (extraUserTurn) {
    contents = [
      ...contents,
      { role: "user", parts: [{ text: extraUserTurn }] },
    ];
  }
  let rounds = 0;

  const readings: EnvironmentReading[] = [];
  const searches: HospitalSearch[] = [];
  const safePlaceSearches: SafePlacesResult[] = [];
  const destinationPins: DestinationPin[] = [];

  // Counted separately from the captured arrays, and incremented before each
  // tool runs, so a call that threw still counts. See ./attribution.ts — a
  // thrown tool captures nothing, which is precisely when these rules matter.
  let destinationAttempts = 0;
  let safePlaceAttempts = 0;

  while (true) {
    const turn = await generateChatTurn(contents, systemInstruction, onAdvice);

    if (turn.functionCalls.length === 0) {
      const environment = pickEnvironment(readings);

      return {
        response: parseAIResponse(turn.text),
        environment,
        hospitals: pickHospitals(searches, environment),
        safePlaces: pickSafePlaces(safePlaceSearches),
        destinationPin: pickDestinationPin(
          destinationPins,
          destinationAttempts,
          safePlaceAttempts,
        ),
      };
    }

    rounds += 1;

    if (rounds > MAX_TOOL_ROUNDS) {
      throw new Error("The AI made too many tool calls without finishing.");
    }

    const results: ToolResult[] = [];

    for (const functionCall of turn.functionCalls) {
      if (!functionCall.name) continue;

      const toolName = functionCall.name;
      const tool = toolRegistry[toolName];

      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      if (toolName === DESTINATION_TOOL) {
        destinationAttempts += 1;
      } else if (toolName === SAFE_PLACES_TOOL) {
        safePlaceAttempts += 1;
      }

      const args = (functionCall.args ?? {}) as Record<string, unknown>;

      let result: unknown;

      try {
        result = await tool(ctx, args, { conversationId });
      } catch (error) {
        // A failing tool is information for the model, not the end of the
        // turn. The common case is a place the geocoder can't resolve — a
        // typo, or somewhere it simply doesn't know — and the model can ask
        // about that far more usefully than a blanket apology can. Letting it
        // propagate meant "Bagiuo" produced "please send your message again",
        // which is both unhelpful and untrue: sending it again fails
        // identically.
        //
        // `search_nearby_hospitals` already returns its failures this way; the
        // environment tool is now consistent with it.
        console.warn(`Tool ${toolName} failed:`, error);

        results.push({
          name: toolName,
          id: functionCall.id,
          result: {
            error: error instanceof Error ? error.message : TOOL_FAILURE_TEXT,
          },
        });

        continue;
      }

      // Everything the UI shows is captured here, straight off the tool
      // result. The model's own reply is never read for these numbers. A tool
      // that failed never reaches this point, so nothing partial is captured.
      if (toolName === ENVIRONMENT_TOOL) {
        const reading = readEnvironmentReading(result);

        if (reading) {
          readings.push(reading);
        }
      } else if (toolName === SAFE_PLACES_TOOL) {
        const found = readSafePlaces(result, args);

        if (found) {
          safePlaceSearches.push(found);
        }
      } else if (toolName === DESTINATION_TOOL) {
        const pin = readDestinationPin(result);

        if (pin) {
          destinationPins.push(pin);
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

      results.push({ name: toolName, id: functionCall.id, result });
    }

    // `turn.parts`, not the function calls — see appendToolResults.
    contents = appendToolResults(contents, turn.parts, results);
  }
}
