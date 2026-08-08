import { describe, expect, it } from "vitest";
import { distanceInKm, formatDistance } from "@/lib/geo";

const MANILA = { latitude: 14.5995, longitude: 120.9842 };
const QUEZON_CITY = { latitude: 14.676, longitude: 121.0437 };

describe("distanceInKm", () => {
  it("is zero for the same point", () => {
    expect(distanceInKm(MANILA, MANILA)).toBe(0);
  });

  it("measures a known short hop", () => {
    // Manila → Quezon City is a little over 10km.
    const distance = distanceInKm(MANILA, QUEZON_CITY);

    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(11.5);
  });

  it("is symmetric", () => {
    expect(distanceInKm(MANILA, QUEZON_CITY)).toBeCloseTo(
      distanceInKm(QUEZON_CITY, MANILA),
      9,
    );
  });

  it("handles antipodal-ish spans without NaN", () => {
    const distance = distanceInKm(
      { latitude: -89, longitude: -179 },
      { latitude: 89, longitude: 179 },
    );

    expect(Number.isFinite(distance)).toBe(true);
    expect(distance).toBeGreaterThan(19_000);
  });
});

describe("formatDistance", () => {
  it("switches to metres below a kilometre", () => {
    expect(formatDistance(0.4)).toBe("400 m");
    expect(formatDistance(0.999)).toBe("999 m");
  });

  it("uses one decimal above a kilometre", () => {
    expect(formatDistance(2.5)).toBe("2.5 km");
    expect(formatDistance(12.34)).toBe("12.3 km");
  });
});
