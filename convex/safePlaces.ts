import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Wider than the 10km hospital radius. Someone lost off a trail may have no
 * settlement within 10km at all, and "nothing found" is a far worse answer
 * than "the nearest town is 14km northeast".
 */
const SEARCH_RADIUS_M = 15000;

/** Cap what goes back to the model; the UI shows only the closest few anyway. */
const MAX_RESULTS = 12;

export type SafePlaceCategory = "town" | "police" | "hospital" | "transport";

type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

/**
 * Which kind of refuge this element is. Ordered by how useful it is to
 * someone who is lost rather than injured: a staffed settlement is reachable
 * and has people in it, which a closed rural clinic may not.
 */
function categorize(tags: Record<string, string>): SafePlaceCategory | null {
  if (
    tags.place === "city" ||
    tags.place === "town" ||
    tags.place === "village"
  ) {
    return "town";
  }
  if (tags.amenity === "police") return "police";
  if (tags.amenity === "hospital") return "hospital";
  if (tags.amenity === "bus_station" || tags.public_transport === "station") {
    return "transport";
  }

  return null;
}

async function queryOverpass(endpoint: string, query: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(endpoint, {
      method: "POST",
      body: query,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Internal: reached only through the Gemini tool loop. Public it would be an
 * open Overpass proxy.
 *
 * Deliberately returns *destinations*, never a route. The model is not allowed
 * to describe a path — see the LOST OR DISORIENTED block in
 * convex/ai/systemPrompt.ts. Google Maps does the routing, from the device's
 * own live position, when the user taps the card.
 */
export const findSafePlaces = internalAction({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },

  handler: async (_, args) => {
    const around = `around:${SEARCH_RADIUS_M},${args.latitude},${args.longitude}`;

    const query = `
[out:json][timeout:25];
(
  node["place"~"^(city|town|village)$"](${around});
  node["amenity"="police"](${around});
  way["amenity"="police"](${around});
  node["amenity"="hospital"](${around});
  way["amenity"="hospital"](${around});
  node["amenity"="bus_station"](${around});
  way["amenity"="bus_station"](${around});
  node["public_transport"="station"](${around});
);
out center;
`;

    let lastError = "Unknown error";

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await queryOverpass(endpoint, query);

        if (!response.ok) {
          lastError = `${endpoint} responded with HTTP ${response.status}`;
          continue;
        }

        const json = await response.json();

        const elements: OverpassElement[] = Array.isArray(json?.elements)
          ? json.elements
          : [];

        const places = elements.flatMap((element) => {
          const tags = element.tags ?? {};
          const category = categorize(tags);

          // `node` carries its own coordinates; `way` only gets them from
          // `out center`.
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;

          if (
            !category ||
            typeof latitude !== "number" ||
            typeof longitude !== "number"
          ) {
            return [];
          }

          const name = tags.name?.trim();

          // An unnamed village is no use as a thing to head towards — you
          // cannot ask anyone the way to it.
          if (!name) {
            return [];
          }

          return [{ name, category, latitude, longitude }];
        });

        return {
          origin: { latitude: args.latitude, longitude: args.longitude },
          places: places.slice(0, MAX_RESULTS),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    console.error("Safe place search failed on all endpoints:", lastError);

    // Same contract as searchNearbyHospitals: report the outage rather than
    // throwing, so the model can say "I couldn't check" instead of the turn
    // dying. The prompt forbids inventing a destination.
    return {
      origin: { latitude: args.latitude, longitude: args.longitude },
      places: [],
      error:
        "The safe-place lookup service is temporarily unavailable right now.",
    };
  },
});
