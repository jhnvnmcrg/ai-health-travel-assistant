import { distanceInKm, type Coordinates } from "./geo";

/**
 * Collapses geocoder matches that describe the same place, leaving one entry
 * per genuinely distinct location.
 *
 * Nominatim routinely returns several records for one place — a node and a way
 * for the same park, a building and its grounds — and those sit metres apart.
 * What matters is whether it returned somewhere *else*: San Jose in Nueva
 * Ecija and San Jose in Batangas are both real, and choosing between them
 * silently is how a traveller ends up six hundred kilometres from where they
 * meant to be.
 *
 * A distance threshold is a coarse net and knowingly so. Two adjacent
 * municipalities called San Isidro can sit inside it, and Davao City alone
 * spans more than it. Comparing the geocoder's province field instead would be
 * sharper where it is populated, and it is inconsistently populated for
 * barangay-level matches — a missing field would disable the check in silence,
 * which is the worse failure.
 */
export function distinctPlaces<T extends Coordinates>(
  candidates: T[],
  separationKm: number,
): T[] {
  const distinct: T[] = [];

  for (const candidate of candidates) {
    const duplicate = distinct.some(
      (kept) => distanceInKm(kept, candidate) <= separationKm,
    );

    if (!duplicate) {
      distinct.push(candidate);
    }
  }

  return distinct;
}
