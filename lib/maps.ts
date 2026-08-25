import type { Coordinates } from "./geo";

/**
 * How the traveller is expected to cover the distance.
 *
 * Only `walking` is ever asserted, and only for a distance we measured. Google
 * Maps defaults to driving when no mode is given, so asserting `driving` buys
 * nothing and costs honesty — a great deal of travel here is by jeepney,
 * tricycle or habal-habal, and the card would be claiming a plan the traveller
 * may have no way to carry out. Transit is not offered at all: Google's data
 * is thin outside Metro Manila, so the mode would mostly return nothing.
 */
export type TravelMode = "walking";

type DirectionsOptions = {
  destination: Coordinates;
  /** Omitted unless a short distance was actually measured. */
  travelMode?: TravelMode;
};

function formatPoint({ latitude, longitude }: Coordinates): string {
  return `${latitude},${longitude}`;
}

/**
 * A Google Maps directions link.
 *
 * The `api=1` universal URL is handled by the Maps app on Android and iOS and
 * by the browser on web, so this needs no platform split — which is the whole
 * reason navigation is handed to Google rather than drawn in the app.
 *
 * There is deliberately no `origin` parameter, so Maps always routes from the
 * device's own live position. Both callers want that, for the same underlying
 * reason: whatever this app believes about where the traveller is standing is
 * a worse estimate than their phone's. A lost person has probably moved since
 * the reply was written, and a geocoded street name is a point somewhere along
 * a road that may be two kilometres long. Either one baked into the URL
 * produces a route that is confidently wrong from its first step, and wrong
 * invisibly — the traveller cannot see which pin Google started from. Left
 * out, a bad guess about their position becomes a Maps screen they can correct
 * in one tap.
 *
 * The destination is always coordinates, never a place name. A name would be
 * re-resolved by Google's own geocoder, which could land somewhere other than
 * the pin the card just showed — reintroducing inside Maps exactly the
 * ambiguity the card's location line exists to expose.
 */
export function buildDirectionsUrl({
  destination,
  travelMode,
}: DirectionsOptions): string {
  const params = [
    "api=1",
    `destination=${encodeURIComponent(formatPoint(destination))}`,
    ...(travelMode ? [`travelmode=${travelMode}`] : []),
  ];

  return `https://www.google.com/maps/dir/?${params.join("&")}`;
}

/**
 * When a walk stops being something to put in front of somebody.
 *
 * Sunset across the Philippines falls between roughly 17:30 and 18:20 all year
 * with almost no twilight — full dark follows within half an hour — and
 * provincial roads are largely unlit with no footpath. So the walking mode is
 * withheld in the evening even for a short hop.
 */
const DUSK_HOUR = 17;
const DAWN_HOUR = 5;

/**
 * Whether a card should open Google Maps in walking mode.
 *
 * Pure, and separated from the component so the decision can be tested: it is
 * the most safety-relevant line the card has, and a component test would prove
 * far less about it than four assertions do.
 *
 * `limitKm` is passed in rather than fixed, because the two cards genuinely
 * differ — a lost traveller on foot has no vehicle to choose instead, whereas
 * somebody walking to a park does.
 */
export function shouldAssertWalking(
  distanceKm: number | undefined,
  limitKm: number,
  hour: number,
): boolean {
  if (distanceKm === undefined || distanceKm > limitKm) {
    return false;
  }

  return hour >= DAWN_HOUR && hour < DUSK_HOUR;
}
