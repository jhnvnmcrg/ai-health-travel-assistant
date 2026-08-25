import { describe, expect, it } from "vitest";
import { distinctPlaces } from "@/lib/placeMatch";

const SEPARATION_KM = 25;

/** A node and a way Nominatim returns for the same park, ~200m apart. */
const BURNHAM_NODE = { latitude: 16.4088, longitude: 120.5942 };
const BURNHAM_WAY = { latitude: 16.4103, longitude: 120.5955 };

/** Two genuinely different places that share a name. */
const SAN_JOSE_NUEVA_ECIJA = { latitude: 15.7911, longitude: 120.9908 };
const SAN_JOSE_BATANGAS = { latitude: 13.8776, longitude: 121.1017 };

describe("distinctPlaces", () => {
  it("keeps an empty list empty", () => {
    expect(distinctPlaces([], SEPARATION_KM)).toEqual([]);
  });

  it("collapses several records of one place", () => {
    // This is the common case, and collapsing it is what stops the ambiguity
    // check firing on every ordinary landmark.
    const distinct = distinctPlaces(
      [BURNHAM_NODE, BURNHAM_WAY, BURNHAM_NODE],
      SEPARATION_KM,
    );

    expect(distinct).toHaveLength(1);
    expect(distinct[0]).toBe(BURNHAM_NODE);
  });

  it("keeps two places that merely share a name", () => {
    const distinct = distinctPlaces(
      [SAN_JOSE_NUEVA_ECIJA, SAN_JOSE_BATANGAS],
      SEPARATION_KM,
    );

    expect(distinct).toHaveLength(2);
  });

  it("keeps the first match at the head of the list", () => {
    // The caller treats the geocoder's top result as the answer when nothing
    // is ambiguous, so the ordering has to survive.
    const distinct = distinctPlaces(
      [SAN_JOSE_BATANGAS, BURNHAM_WAY, SAN_JOSE_NUEVA_ECIJA],
      SEPARATION_KM,
    );

    expect(distinct[0]).toBe(SAN_JOSE_BATANGAS);
    expect(distinct).toHaveLength(3);
  });

  it("compares against every kept place, not only the previous one", () => {
    // A naive implementation that only checks its immediate predecessor would
    // report three distinct places here and send the model asking a question
    // with no real alternatives in it.
    const distinct = distinctPlaces(
      [BURNHAM_NODE, SAN_JOSE_BATANGAS, BURNHAM_WAY],
      SEPARATION_KM,
    );

    expect(distinct).toHaveLength(2);
  });

  it("carries the full candidate object through, not just its coordinates", () => {
    const named = { ...BURNHAM_NODE, locationName: "Burnham Park" };

    expect(distinctPlaces([named], SEPARATION_KM)[0].locationName).toBe(
      "Burnham Park",
    );
  });
});
