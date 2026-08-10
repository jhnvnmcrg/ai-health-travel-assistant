import { calculateHeatIndex } from "../utils/heatIndex";

/**
 * What the geocoder resolved. The name is the geocoder's own label for what it
 * matched, which is authoritative in a way that asking the model to echo back
 * the place it was told about never was.
 */
export type GeocodeResult = {
  locationName: string;
  latitude: number;
  longitude: number;
};

/**
 * Live conditions at a point.
 *
 * Every measurement is optional, because the upstream feeds genuinely return
 * null for some coordinates — CAMS has gaps in particulate coverage, and UV is
 * absent from some model runs. A missing metric is dropped rather than
 * defaulted: `pm25: 0` renders as "Good" air quality, which is a lie the
 * previous `?? 0` would have told.
 */
export type Conditions = {
  altitude?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  uvIndex?: number;
  rainProbability?: number;
  heatIndex?: number;
  pm25?: number;
  pm10?: number;
};

export type EnvironmentReading = GeocodeResult & Conditions;

/** Upstream nulls, absent keys and NaN all collapse to "no reading". */
function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Nominatim's usage policy caps callers at roughly one request a second and
 * asks that results be cached. convex/environment.ts caches these, which is
 * why this is split out from the live conditions below.
 */
export async function geocodeLocation(
  location: string,
): Promise<GeocodeResult> {
  const geoResponse = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      `${location}, Philippines`,
    )}`,
    {
      headers: {
        "User-Agent": "HealthTravelPH/1.0",
      },
    },
  );

  // These messages are handed back to the model as a tool error, so they have
  // to be worth reading: which of the two failures happened, and what was
  // searched for. "Location not found: Bagiuo" is enough for the model to
  // suggest the spelling the user probably meant.
  if (!geoResponse.ok) {
    throw new Error("The location lookup service is temporarily unavailable.");
  }

  const geo = await geoResponse.json();

  if (!Array.isArray(geo) || geo.length === 0) {
    throw new Error(`Location not found: ${location}`);
  }

  const latitude = Number(geo[0].lat);
  const longitude = Number(geo[0].lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Geocoder returned coordinates that could not be read.");
  }

  const displayName: string =
    typeof geo[0].display_name === "string" ? geo[0].display_name : "";
  const locationName: string =
    (typeof geo[0].name === "string" && geo[0].name) ||
    displayName.split(",")[0].trim() ||
    location;

  return { locationName, latitude, longitude };
}

/** Live weather, air quality and elevation. Deliberately not cached. */
export async function fetchConditions(
  latitude: number,
  longitude: number,
): Promise<Conditions> {
  const [weatherResponse, airResponse, elevationResponse] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index&hourly=precipitation_probability`,
    ),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10`,
    ),
    fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitude}&longitude=${longitude}`,
    ),
  ]);

  if (!weatherResponse.ok) {
    throw new Error("The weather service is temporarily unavailable.");
  }

  const weather = await weatherResponse.json();

  // Air quality and elevation are enrichment: if either feed is down the advice
  // is still worth giving, just with fewer metrics beside it. Weather is not —
  // temperature and humidity drive the heat index, which is the headline risk
  // in this climate.
  const air = airResponse.ok ? await airResponse.json() : {};
  const elevation = elevationResponse.ok ? await elevationResponse.json() : {};

  const temperature = readNumber(weather.current?.temperature_2m);
  const humidity = readNumber(weather.current?.relative_humidity_2m);

  return {
    altitude: readNumber(elevation.elevation?.[0]),

    temperature,
    humidity,
    windSpeed: readNumber(weather.current?.wind_speed_10m),

    uvIndex: readNumber(weather.current?.uv_index),
    rainProbability: readNumber(weather.hourly?.precipitation_probability?.[0]),

    heatIndex:
      temperature !== undefined && humidity !== undefined
        ? calculateHeatIndex(temperature, humidity)
        : undefined,

    pm25: readNumber(air.current?.pm2_5),
    pm10: readNumber(air.current?.pm10),
  };
}
