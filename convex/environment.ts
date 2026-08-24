import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  fetchConditions,
  geocodeLocation,
  reverseGeocode,
  type EnvironmentReading,
  type GeocodeResult,
} from "./services/environmentService";

/** Place coordinates do not move. The cache exists for Nominatim, not freshness. */
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeQuery(location: string): string {
  return location.trim().toLowerCase().replace(/\s+/g, " ");
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

type CachedGeocode = GeocodeResult & { fetchedAt: number };

/**
 * Returns the entry and lets the caller judge its age.
 *
 * The freshness test deliberately does not live here: a query is not rerun
 * merely because time has advanced, so a `Date.now()` comparison inside one
 * can answer from a moment that has passed — and reading the clock in a query
 * costs cache reuse besides. Actions may read the clock freely.
 */
export const readGeocodeCache = internalQuery({
  args: {
    query: v.string(),
  },

  handler: async (ctx, args): Promise<CachedGeocode | null> => {
    const cached = await ctx.db
      .query("geocodeCache")
      .withIndex("by_query", (q) => q.eq("query", args.query))
      .unique();

    if (!cached) {
      return null;
    }

    return {
      locationName: cached.locationName,
      latitude: cached.latitude,
      longitude: cached.longitude,
      fetchedAt: cached.fetchedAt,
    };
  },
});

export const writeGeocodeCache = internalMutation({
  args: {
    query: v.string(),
    locationName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("geocodeCache")
      .withIndex("by_query", (q) => q.eq("query", args.query))
      .unique();

    const entry = {
      query: args.query,
      locationName: args.locationName,
      latitude: args.latitude,
      longitude: args.longitude,
      fetchedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, entry);
      return;
    }

    await ctx.db.insert("geocodeCache", entry);
  },
});

/**
 * Internal: reached only through the Gemini tool loop
 * (convex/ai/toolRegistry.ts). Public would let anyone use this deployment as
 * a free geocoding/weather proxy.
 */
export const fetchLocationEnvironmentData = internalAction({
  /**
   * Either a place name or a coordinate pair. Coordinates win when both are
   * given: they are where the person actually is, whereas a name resolves to
   * the centre of a town they may be kilometres outside.
   */
  args: {
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },

  handler: async (
    ctx,
    { location, latitude, longitude },
  ): Promise<EnvironmentReading> => {
    const hasCoordinates = latitude !== undefined && longitude !== undefined;

    if (!hasCoordinates && !location) {
      throw new Error(
        "Give me either a place name or a latitude and longitude.",
      );
    }

    const query = hasCoordinates
      ? reverseQueryKey(latitude, longitude)
      : normalizeQuery(location!);

    const cached: CachedGeocode | null = await ctx.runQuery(
      internal.environment.readGeocodeCache,
      { query },
    );

    let place: GeocodeResult | null =
      cached && Date.now() - cached.fetchedAt <= GEOCODE_TTL_MS ? cached : null;

    // A cached reverse entry stores the rounded coordinates it was keyed on.
    // Conditions must still be fetched for the exact position given.
    if (place && hasCoordinates) {
      place = { ...place, latitude, longitude };
    }

    if (!place) {
      if (hasCoordinates) {
        // The label is enrichment. Conditions at the right spot matter far
        // more than a name for it, so a failed reverse lookup degrades to an
        // unlabelled reading rather than failing the whole tool.
        try {
          place = await reverseGeocode(latitude, longitude);

          await ctx.runMutation(internal.environment.writeGeocodeCache, {
            query,
            ...place,
          });
        } catch (error) {
          console.warn(
            "Reverse geocoding failed; continuing unlabelled:",
            error,
          );

          place = { locationName: "", latitude, longitude };
        }
      } else {
        place = await geocodeLocation(location!);

        await ctx.runMutation(internal.environment.writeGeocodeCache, {
          query,
          ...place,
        });
      }
    }

    const conditions = await fetchConditions(place.latitude, place.longitude);

    return { ...place, ...conditions };
  },
});
