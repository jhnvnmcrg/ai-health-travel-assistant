import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  geocodeLocation,
  reverseGeocode,
  type GeocodeResult,
} from "../services/environmentService";

/**
 * Place coordinates do not move. The cache exists to satisfy Nominatim's usage
 * policy, not to keep anything fresh.
 */
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Every cache key in the app is derived here.
 *
 * Two callers now resolve place names — the environment tool and the
 * directions tool — and a second normalisation would quietly split the table
 * into two key spaces that never share a hit.
 */
function normalizeQuery(location: string): string {
  return location.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Which lookup a cached name belongs to.
 *
 * `destination` entries live under their own prefix because convex/destination.ts
 * only writes one after confirming the name was unambiguous. Sharing the key
 * space with `place` would let an environment lookup — which takes the
 * geocoder's first match without asking — populate the key, and the next
 * traveller asking the way to "San Jose" would silently inherit whichever San
 * Jose that was. A duplicate Nominatim call is the price of that check running
 * every time rather than only on a cold cache.
 */
export type PlaceCacheScope = "place" | "destination";

function cacheKey(location: string, scope: PlaceCacheScope): string {
  const normalized = normalizeQuery(location);

  return scope === "destination" ? `dest:${normalized}` : normalized;
}

/** A cached name, or null when there is none or it has aged out. */
export async function readCachedPlace(
  ctx: ActionCtx,
  location: string,
  scope: PlaceCacheScope = "place",
): Promise<GeocodeResult | null> {
  const cached = await ctx.runQuery(internal.environment.readGeocodeCache, {
    query: cacheKey(location, scope),
  });

  if (!cached || Date.now() - cached.fetchedAt > GEOCODE_TTL_MS) {
    return null;
  }

  return {
    locationName: cached.locationName,
    ...(cached.label ? { label: cached.label } : {}),
    latitude: cached.latitude,
    longitude: cached.longitude,
  };
}

export async function writeCachedPlace(
  ctx: ActionCtx,
  location: string,
  place: GeocodeResult,
  scope: PlaceCacheScope = "place",
): Promise<void> {
  await ctx.runMutation(internal.environment.writeGeocodeCache, {
    query: cacheKey(location, scope),
    ...place,
  });
}

/**
 * Cache key for a reverse lookup, rounded to ~110m.
 *
 * The rounding is what makes the cache work at all: raw GPS readings never
 * repeat, so an exact key would miss every single time and hit Nominatim on
 * every request. Place names do not change across 110m, so nothing is lost.
 *
 * Prefixed so it can never collide with a forward lookup for somewhere that
 * happens to be named like a coordinate pair.
 */
function reverseQueryKey(latitude: number, longitude: number): string {
  return `reverse:${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

/**
 * A place name to a point, through the cache.
 *
 * Throws when the name cannot be resolved. The message is written to be read
 * by the model — see the comments in convex/services/environmentService.ts —
 * because the orchestrator hands tool failures back to it verbatim.
 */
export async function resolveNamedPlace(
  ctx: ActionCtx,
  location: string,
): Promise<GeocodeResult> {
  const cached = await readCachedPlace(ctx, location);

  if (cached) {
    return cached;
  }

  const place = await geocodeLocation(location);

  await writeCachedPlace(ctx, location, place);

  return place;
}

/**
 * A point to the geocoder's own name for it.
 *
 * The returned coordinates are always the ones passed in. A cache entry is
 * keyed on rounded coordinates and stores whichever exact pair first populated
 * it, so only its *name* is reusable — reading its position back would snap
 * the traveller up to 110m from where they actually are.
 *
 * The label is enrichment, so a failed lookup degrades to an unnamed point
 * rather than failing the caller.
 */
export async function resolveCoordinates(
  ctx: ActionCtx,
  latitude: number,
  longitude: number,
): Promise<GeocodeResult> {
  const query = reverseQueryKey(latitude, longitude);

  const cached = await ctx.runQuery(internal.environment.readGeocodeCache, {
    query,
  });

  if (cached && Date.now() - cached.fetchedAt <= GEOCODE_TTL_MS) {
    return {
      locationName: cached.locationName,
      ...(cached.label ? { label: cached.label } : {}),
      latitude,
      longitude,
    };
  }

  try {
    const place = await reverseGeocode(latitude, longitude);

    await ctx.runMutation(internal.environment.writeGeocodeCache, {
      query,
      ...place,
    });

    return place;
  } catch (error) {
    console.warn("Reverse geocoding failed; continuing unlabelled:", error);

    return { locationName: "", latitude, longitude };
  }
}
