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
  type EnvironmentReading,
  type GeocodeResult,
} from "./services/environmentService";

/** Place coordinates do not move. The cache exists for Nominatim, not freshness. */
const GEOCODE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeQuery(location: string): string {
  return location.trim().toLowerCase().replace(/\s+/g, " ");
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
  args: {
    location: v.string(),
  },

  handler: async (ctx, { location }): Promise<EnvironmentReading> => {
    const query = normalizeQuery(location);

    const cached: CachedGeocode | null = await ctx.runQuery(
      internal.environment.readGeocodeCache,
      { query },
    );

    let place: GeocodeResult | null =
      cached && Date.now() - cached.fetchedAt <= GEOCODE_TTL_MS ? cached : null;

    if (!place) {
      place = await geocodeLocation(location);

      await ctx.runMutation(internal.environment.writeGeocodeCache, {
        query,
        ...place,
      });
    }

    const conditions = await fetchConditions(place.latitude, place.longitude);

    return { ...place, ...conditions };
  },
});
