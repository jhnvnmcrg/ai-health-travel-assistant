import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const REQUEST_TIMEOUT_MS = 15000;

/** The subset of an Overpass element this uses. */
type OverpassElement = {
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: { name?: string };
};

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

/** Internal: reached only through the Gemini tool loop. */
export const searchNearbyHospitals = internalAction({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },

  handler: async (_, args) => {
    const query = `
[out:json][timeout:20];
(
  node["amenity"="hospital"](around:10000,${args.latitude},${args.longitude});
  way["amenity"="hospital"](around:10000,${args.latitude},${args.longitude});
  relation["amenity"="hospital"](around:10000,${args.latitude},${args.longitude});
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

        // `node` carries its own coordinates; `way` and `relation` only get
        // them from `out center`.
        const hospitals = elements.flatMap((element) => {
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;

          if (typeof latitude !== "number" || typeof longitude !== "number") {
            return [];
          }

          return [
            {
              name: element.tags?.name?.trim() || "Unnamed Hospital",
              latitude,
              longitude,
            },
          ];
        });

        return { hospitals };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    console.error("Hospital search failed on all endpoints:", lastError);

    return {
      hospitals: [],
      error:
        "The hospital lookup service is temporarily unavailable right now.",
    };
  },
});
