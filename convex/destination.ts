import { internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  readCachedPlace,
  resolveCoordinates,
  resolveNamedPlace,
  writeCachedPlace,
} from "./lib/placeResolver";
import {
  geocodeCandidates,
  type GeocodeResult,
} from "./services/environmentService";
import { distanceInKm } from "../lib/geo";
import { distinctPlaces } from "../lib/placeMatch";

/** How many matches to ask Nominatim for when testing a name for ambiguity. */
const CANDIDATE_LIMIT = 5;

/**
 * Two matches further apart than this are different places rather than two
 * records of one. Nominatim routinely returns a node and a way for the same
 * park; those sit metres apart and collapse. San Jose in Nueva Ecija and San
 * Jose in Batangas do not.
 */
const AMBIGUITY_SEPARATION_KM = 25;

/** How many alternatives to name back to the model when a query is ambiguous. */
const AMBIGUITY_EXAMPLES = 3;

/**
 * Below this the two ends are the same spot as far as a map is concerned, and
 * the distance line is dropped rather than rendering "0 m". It happens when a
 * geocoder collapses two names onto one municipal centroid.
 */
const MIN_SEPARATION_KM = 0.05;

/**
 * Past this, a tappable card is the wrong artifact.
 *
 * A destination this far away is usually a geocode that landed in the wrong
 * province — the failure this whole file is built around — and where it is
 * genuine it is a flight or an overnight ferry, not something Google Maps can
 * draw a road to. Refusing here, with the distance named, lets the model ask
 * the one useful question instead of handing over a card that opens on
 * "no route found".
 */
const MAX_MAPPABLE_KM = 400;

/**
 * Sent back with every successful lookup.
 *
 * The same device as `reminderNote` in convex/trips.ts: a sentence for the
 * model, arriving in the freshest position in its context — immediately before
 * the generation that writes the reply. "None is available to you" is the
 * load-bearing clause. Without it a model reads the absence of a route as
 * something the tool merely failed to provide, and helpfully supplies one from
 * memory.
 */
const NOTE =
  "No route, road distance, travel time or heading was looked up, and none is available to you. Name the matched place and its province, and the straight-line distance if it is given here. Do not describe how to get there, do not name roads, turns or compass directions, and do not estimate how long it takes. The app is showing the traveller a tappable card that opens Google Maps.";

type ResolvedDestination = GeocodeResult & {
  /** What the traveller called it, kept so the card can show both when they differ. */
  query: string;
};

function describe(place: GeocodeResult): string {
  return place.label
    ? `${place.locationName}, ${place.label}`
    : place.locationName;
}

/**
 * Where they want to go.
 *
 * Only ever a name. Coordinates are deliberately not accepted here, even
 * relayed from an earlier tool result in the same conversation: a hallucinated
 * pin rendered as a tappable navigation launch is the worst thing this feature
 * could produce, and it is the only failure with no visible tell. It is the
 * same reason `COORDINATE_TOLERANCE` was deleted when the model stopped
 * transcribing tool data — see "The response contract" in CLAUDE.md. A name
 * the geocoder cannot match fails loudly instead, which is the safe direction.
 */
async function resolveDestinationEnd(
  ctx: ActionCtx,
  name: string | undefined,
): Promise<ResolvedDestination> {
  const query = name?.trim();

  if (!query) {
    throw new Error("I don't know where they want to go. Ask them.");
  }

  // Written only after the ambiguity check below passes, and under its own key
  // prefix, so a hit here is a name already confirmed to mean one place.
  const cached = await readCachedPlace(ctx, query, "destination");

  if (cached) {
    return { ...cached, query };
  }

  const candidates = await geocodeCandidates(query, CANDIDATE_LIMIT);
  // Refusing a name the geocoder had a real choice about is the single most
  // important thing this action does. There are dozens of San Jose, Santa
  // Cruz, Poblacion and Rizal Street; `limit=1` picks one silently, and a
  // traveller in Batangas has no way to tell they were handed the Nueva Ecija
  // one. Asking costs a turn. Not asking can cost a day.
  const distinct = distinctPlaces(candidates, AMBIGUITY_SEPARATION_KM);

  if (distinct.length > 1) {
    const options = distinct
      .slice(0, AMBIGUITY_EXAMPLES)
      .map(describe)
      .join("; ");

    // Deliberately not cached. Storing the first match would poison the key and
    // silently answer the next traveller without asking them either.
    throw new Error(
      `"${query}" matches more than one place in the Philippines: ${options}. Ask which one they mean before mapping it — do not choose for them.`,
    );
  }

  const [place] = candidates;

  await writeCachedPlace(ctx, query, place, "destination");

  return { ...place, query };
}

/**
 * Where they are starting from, if they said.
 *
 * Entirely optional, and a failure here degrades rather than fails the tool.
 * The Google Maps URL never carries an origin (see lib/maps.ts), so this is
 * used only to measure a straight line — and losing the distance must never
 * cost the traveller the map. Street-level names in the rural Philippines are
 * precisely what Nominatim resolves worst, which is the same reason the
 * reverse-geocode path in convex/lib/placeResolver.ts degrades too.
 */
async function resolveOriginEnd(
  ctx: ActionCtx,
  name: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
): Promise<GeocodeResult | undefined> {
  if (latitude !== undefined && longitude !== undefined) {
    return await resolveCoordinates(ctx, latitude, longitude);
  }

  const query = name?.trim();

  if (!query) {
    return undefined;
  }

  try {
    return await resolveNamedPlace(ctx, query);
  } catch (error) {
    console.warn("Origin lookup failed; mapping without a distance:", error);

    return undefined;
  }
}

/**
 * Internal: reached only through the Gemini tool loop
 * (convex/ai/toolRegistry.ts). Public it would be an open geocoding proxy.
 *
 * Resolves a destination to a point, and nothing else. It does not know the
 * roads, the traffic, whether a route exists at all, or how long one would
 * take — components/DestinationCard.tsx hands all of that to Google Maps when
 * the traveller taps. Nothing here may be used to describe a way to go; see
 * the ROUTES AND DIRECTIONS block in convex/ai/systemPrompt.ts.
 *
 * That is the design's load-bearing refusal, and it is why there is no routing
 * provider behind this. A real turn-by-turn result would answer the "how long
 * will it take" question users actually have — and the moment a route exists
 * in the model's context it will be paraphrased, shortened or confidently
 * misremembered, and the safety property is gone.
 *
 * Note there is no compass bearing here either, unlike convex/safePlaces.ts.
 * For someone lost in open country "the village is 4km northeast" is standard
 * guidance and the alternative is nothing. For someone on a street it is a
 * heading, and it will be walked — into a one-way road, a walled subdivision,
 * a river. Distance says how far without saying which way.
 *
 * Failures throw rather than returning `{ error }`. The common ones are a name
 * the geocoder cannot match and a name it matches too many times, and both
 * messages are written to be read by the model. convex/ai/orchestrator.ts
 * turns the throw into `{ error }` for it and — the part that matters —
 * captures nothing, so a half-resolved lookup can never reach the card.
 */
export const resolveDestination = internalAction({
  /**
   * A destination name, and an origin in whichever form they gave it. Nothing
   * is individually required, because Gemini omits empty arguments and the
   * handler gives better messages than a validator can.
   */
  args: {
    destination: v.optional(v.string()),

    origin: v.optional(v.string()),
    originLatitude: v.optional(v.number()),
    originLongitude: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    // Sequential, deliberately: Nominatim asks callers to stay under roughly
    // one request a second, and `Promise.all` here would put two in flight at
    // once for every uncached lookup. The pair of awaits is the rate limit.
    const destination = await resolveDestinationEnd(ctx, args.destination);

    const origin = await resolveOriginEnd(
      ctx,
      args.origin,
      args.originLatitude,
      args.originLongitude,
    );

    const straightLineKm = origin
      ? distanceInKm(origin, destination)
      : undefined;

    if (straightLineKm !== undefined && straightLineKm > MAX_MAPPABLE_KM) {
      throw new Error(
        `${describe(destination)} is about ${Math.round(straightLineKm)}km from ${describe(origin!)} in a straight line. That is either the wrong match or a journey needing a flight or ferry rather than a map — check which place they meant, and do not map it.`,
      );
    }

    // Both ends on one point: keep the pin, drop the measurement rather than
    // reporting "0 m" as though it meant something.
    const measurable =
      straightLineKm !== undefined && straightLineKm >= MIN_SEPARATION_KM;

    return {
      destination: {
        name: destination.locationName,
        label: destination.label,
        query: destination.query,
        latitude: destination.latitude,
        longitude: destination.longitude,
      },

      ...(origin && measurable
        ? {
            origin: {
              name: origin.locationName,
              label: origin.label,
              latitude: origin.latitude,
              longitude: origin.longitude,
            },

            // Given to the model so it never has to do trigonometry, and
            // rounded so it never quotes six decimal places of false precision
            // at anyone. The card recomputes it from the coordinates, so the
            // two cannot disagree.
            straightLineKm: Number(straightLineKm!.toFixed(1)),
          }
        : {}),

      routeIncluded: false,
      note: NOTE,
    };
  },
});
