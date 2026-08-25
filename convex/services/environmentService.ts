import { calculateHeatIndex } from "../utils/heatIndex";

/**
 * What the geocoder resolved. The name is the geocoder's own label for what it
 * matched, which is authoritative in a way that asking the model to echo back
 * the place it was told about never was.
 */
export type GeocodeResult = {
  locationName: string;
  /**
   * The administrative trail beneath the name — "Baguio, Benguet".
   *
   * The most important string on a destination card in this country. There are
   * dozens of San Jose, Santa Cruz, Poblacion and Rizal Street; Nominatim
   * picks one of them silently, and the name on its own cannot tell a
   * traveller in Batangas that they have been handed the Nueva Ecija one.
   *
   * Optional because a reverse lookup may have nothing administrative to say,
   * and because cache rows written before this existed do not carry it.
   */
  label?: string;
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
 * How many segments of Nominatim's `display_name` are kept as the label.
 * Two reads as "Baguio, Benguet" — enough to place somewhere, short enough to
 * sit on one line of a card.
 */
const LABEL_SEGMENTS = 2;

/**
 * The administrative trail beneath a matched place, from `display_name`.
 *
 * The name itself, the postcode and the country are dropped — they are either
 * already on screen or the same for everything this app can return. Region
 * names are dropped too when a province survives without them, because the
 * province is what a traveller recognises.
 *
 * Only regions with "Region" in the name are caught, so Central Luzon,
 * Calabarzon and Mimaropa survive as a second segment. That is left alone
 * deliberately rather than fixed with a hardcoded list of the seventeen: the
 * province always leads, which is the segment that actually disambiguates, and
 * a stale list would fail silently the first time one was renamed.
 */
export function administrativeLabel(displayName: string, name: string): string {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(
      (part) =>
        part !== "" &&
        part !== name &&
        !/^\d+$/.test(part) &&
        part.toLowerCase() !== "philippines",
    );

  const withoutRegions = parts.filter((part) => !/\bregion\b/i.test(part));

  const chosen = withoutRegions.length > 0 ? withoutRegions : parts;

  return chosen.slice(0, LABEL_SEGMENTS).join(", ");
}

async function nominatimSearch(
  location: string,
  limit: number,
): Promise<unknown[]> {
  const response = await fetch(
    // `countrycodes` is a filter; the ", Philippines" suffix is only a ranking
    // hint, and on its own it lets a foreign match through with full
    // confidence. Both are kept — the filter for correctness, the suffix
    // because it still improves the ordering within the country.
    `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ph&limit=${limit}&q=${encodeURIComponent(
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
  if (!response.ok) {
    throw new Error("The location lookup service is temporarily unavailable.");
  }

  const geo = await response.json();

  if (!Array.isArray(geo) || geo.length === 0) {
    throw new Error(`Location not found: ${location}`);
  }

  return geo;
}

function readCandidate(
  entry: unknown,
  fallbackName: string,
): GeocodeResult | null {
  const record = (entry ?? {}) as Record<string, unknown>;

  const latitude = Number(record.lat);
  const longitude = Number(record.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const displayName =
    typeof record.display_name === "string" ? record.display_name : "";

  const locationName =
    (typeof record.name === "string" && record.name) ||
    displayName.split(",")[0].trim() ||
    fallbackName;

  const label = administrativeLabel(displayName, locationName);

  return {
    locationName,
    ...(label ? { label } : {}),
    latitude,
    longitude,
  };
}

/**
 * Nominatim's usage policy caps callers at roughly one request a second and
 * asks that results be cached. convex/lib/placeResolver.ts caches these, which
 * is why this is split out from the live conditions below.
 */
export async function geocodeLocation(
  location: string,
): Promise<GeocodeResult> {
  const [first] = await nominatimSearch(location, 1);

  const place = readCandidate(first, location);

  if (!place) {
    throw new Error("Geocoder returned coordinates that could not be read.");
  }

  return place;
}

/**
 * The top few matches for a name, so a caller can tell whether the geocoder
 * had a real choice to make.
 *
 * Only convex/destination.ts wants this. The environment tool is content with
 * the best match: being a few kilometres off changes a temperature reading
 * very little, whereas being in the wrong province sends somebody on a
 * six-hundred-kilometre journey.
 */
export async function geocodeCandidates(
  location: string,
  limit: number,
): Promise<GeocodeResult[]> {
  const raw = await nominatimSearch(location, limit);

  const places = raw.flatMap((entry) => {
    const place = readCandidate(entry, location);

    return place ? [place] : [];
  });

  if (places.length === 0) {
    throw new Error("Geocoder returned coordinates that could not be read.");
  }

  return places;
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

/**
 * Turns coordinates into the geocoder's own name for that spot.
 *
 * The returned coordinates are the ones passed **in**, not Nominatim's. The
 * whole point of the coordinate path is conditions where the person actually
 * is; snapping to the town centre Nominatim reports would throw that away and
 * reintroduce exactly the error the map-pin button exists to avoid.
 *
 * `zoom=12` asks for town/municipality granularity — a useful label, rather
 * than a street address nobody needs on a metric strip.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        "User-Agent": "HealthTravelPH/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error("The location lookup service is temporarily unavailable.");
  }

  const json = await response.json();
  const address = (json?.address ?? {}) as Record<string, unknown>;

  const candidates = [
    json?.name,
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.county,
    address.state,
  ];

  const readString = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

  const locationName =
    candidates.map(readString).find((value) => value !== "") ?? "";

  // The province, and the region only if there is no province. Same job as the
  // label on a forward lookup: it is what tells someone the pin landed in the
  // wrong part of the country.
  const label = [address.province, address.state, address.region]
    .map(readString)
    .filter((value) => value !== "" && value !== locationName)
    .slice(0, 1)
    .join(", ");

  return {
    locationName,
    ...(label ? { label } : {}),
    latitude,
    longitude,
  };
}
