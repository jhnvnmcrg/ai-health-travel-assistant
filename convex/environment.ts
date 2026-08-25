import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { resolveCoordinates, resolveNamedPlace } from "./lib/placeResolver";
import {
  fetchConditions,
  type EnvironmentReading,
  type GeocodeResult,
} from "./services/environmentService";

type CachedGeocode = GeocodeResult & { fetchedAt: number };

/**
 * Returns the entry and lets the caller judge its age.
 *
 * The freshness test deliberately does not live here: a query is not rerun
 * merely because time has advanced, so a `Date.now()` comparison inside one
 * can answer from a moment that has passed — and reading the clock in a query
 * costs cache reuse besides. Actions may read the clock freely, and
 * convex/lib/placeResolver.ts is where they do.
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
      ...(cached.label ? { label: cached.label } : {}),
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
    label: v.optional(v.string()),
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
      label: args.label,
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

    const place = hasCoordinates
      ? await resolveCoordinates(ctx, latitude, longitude)
      : await resolveNamedPlace(ctx, location!);

    // Always the coordinates that came back from resolution, which for the
    // coordinate path are the ones passed in — never Nominatim's snapped-to-
    // town-centre ones, which would defeat the point of sharing a GPS fix.
    const conditions = await fetchConditions(place.latitude, place.longitude);

    return { ...place, ...conditions };
  },
});
