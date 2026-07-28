import { action } from "./_generated/server";
import { v } from "convex/values";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

const REQUEST_TIMEOUT_MS = 15000;

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

export const searchNearbyHospitals = action({
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

        const hospitals = (json.elements ?? [])
          .map((hospital: any) => ({
            name: hospital.tags?.name ?? "Unnamed Hospital",
            latitude: hospital.lat ?? hospital.center?.lat,
            longitude: hospital.lon ?? hospital.center?.lon,
          }))
          .filter(
            (hospital: any) =>
              typeof hospital.latitude === "number" &&
              typeof hospital.longitude === "number",
          );

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
