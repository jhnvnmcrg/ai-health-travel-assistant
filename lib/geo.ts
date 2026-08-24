const EARTH_RADIUS_KM = 6371;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres (haversine). */
export function distanceInKm(from: Coordinates, to: Coordinates): number {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLon / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${km.toFixed(1)} km`;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Initial great-circle bearing from `from` to `to`, in degrees clockwise from
 * true north (0–360).
 */
export function bearingInDegrees(from: Coordinates, to: Coordinates): number {
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS_POINTS = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
] as const;

/**
 * A bearing as a spoken compass direction.
 *
 * Eight points, not sixteen: "northeast" is something someone can act on
 * without a compass, whereas "north-northeast" is false precision for a person
 * reading it off a phone screen while lost.
 */
export function compassDirection(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;

  return COMPASS_POINTS[Math.round(normalized / 45) % 8];
}
