import { describe, expect, it } from "vitest";
import { buildDirectionsUrl, shouldAssertWalking } from "@/lib/maps";

const BURNHAM_PARK = { latitude: 16.4088, longitude: 120.5942 };

describe("buildDirectionsUrl", () => {
  it("builds a destination-only link", () => {
    expect(buildDirectionsUrl({ destination: BURNHAM_PARK })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=16.4088%2C120.5942",
    );
  });

  it("adds the travel mode only when one is given", () => {
    expect(
      buildDirectionsUrl({
        destination: BURNHAM_PARK,
        travelMode: "walking",
      }),
    ).toBe(
      "https://www.google.com/maps/dir/?api=1" +
        "&destination=16.4088%2C120.5942&travelmode=walking",
    );
  });

  it("never carries an origin", () => {
    // Google then routes from the device's live position. A stored or geocoded
    // start would be a route that is wrong from its first step, and wrong
    // where the traveller cannot see it.
    const url = buildDirectionsUrl({
      destination: BURNHAM_PARK,
      travelMode: "walking",
    });

    expect(url).not.toContain("origin");
  });

  it("percent-encodes the comma between latitude and longitude", () => {
    const url = buildDirectionsUrl({ destination: BURNHAM_PARK });

    expect(url).not.toContain("destination=16.4088,");
    expect(url).toContain("%2C");
  });

  it("keeps negative and fractional coordinates intact", () => {
    // A sign lost in formatting would point the traveller at the wrong
    // hemisphere.
    const url = buildDirectionsUrl({
      destination: { latitude: -8.5, longitude: -125.25 },
    });

    expect(url).toContain("destination=-8.5%2C-125.25");
  });
});

describe("shouldAssertWalking", () => {
  const LIMIT_KM = 2;

  it("walks a short daytime hop", () => {
    expect(shouldAssertWalking(1.5, LIMIT_KM, 14)).toBe(true);
  });

  it("refuses a walk that would start after dark", () => {
    // Sunset is 17:30-18:20 year round with almost no twilight, and provincial
    // roads have no lighting and no footpath.
    expect(shouldAssertWalking(1.5, LIMIT_KM, 17)).toBe(false);
    expect(shouldAssertWalking(1.5, LIMIT_KM, 21)).toBe(false);
    expect(shouldAssertWalking(1.5, LIMIT_KM, 3)).toBe(false);
  });

  it("walks again once it is properly light", () => {
    expect(shouldAssertWalking(1.5, LIMIT_KM, 5)).toBe(true);
    expect(shouldAssertWalking(1.5, LIMIT_KM, 16)).toBe(true);
  });

  it("refuses anything past the limit whatever the hour", () => {
    expect(shouldAssertWalking(3, LIMIT_KM, 10)).toBe(false);
    expect(shouldAssertWalking(LIMIT_KM, LIMIT_KM, 10)).toBe(true);
  });

  it("never walks when no distance was measured", () => {
    // No origin means no distance, and a mode asserted on nothing is a guess.
    expect(shouldAssertWalking(undefined, LIMIT_KM, 10)).toBe(false);
  });
});
