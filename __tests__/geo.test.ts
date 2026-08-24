import { describe, expect, it } from "vitest";
import {
  bearingInDegrees,
  compassDirection,
  distanceInKm,
  formatDistance,
} from "@/lib/geo";

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

describe("bearingInDegrees", () => {
  const origin = { latitude: 14, longitude: 121 };

  it("reads 0 for due north and 180 for due south", () => {
    expect(
      bearingInDegrees(origin, { latitude: 15, longitude: 121 }),
    ).toBeCloseTo(0, 1);
    expect(
      bearingInDegrees(origin, { latitude: 13, longitude: 121 }),
    ).toBeCloseTo(180, 1);
  });

  it("reads roughly 90 for due east and 270 for due west", () => {
    expect(
      bearingInDegrees(origin, { latitude: 14, longitude: 122 }),
    ).toBeCloseTo(90, 0);
    expect(
      bearingInDegrees(origin, { latitude: 14, longitude: 120 }),
    ).toBeCloseTo(270, 0);
  });

  it("always returns a value in [0, 360)", () => {
    const targets = [
      { latitude: 15, longitude: 120 },
      { latitude: 13, longitude: 122 },
      { latitude: -30, longitude: -170 },
    ];

    for (const target of targets) {
      const bearing = bearingInDegrees(origin, target);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThan(360);
    }
  });
});

describe("compassDirection", () => {
  it("maps the eight cardinal and diagonal points", () => {
    expect(compassDirection(0)).toBe("north");
    expect(compassDirection(45)).toBe("northeast");
    expect(compassDirection(90)).toBe("east");
    expect(compassDirection(135)).toBe("southeast");
    expect(compassDirection(180)).toBe("south");
    expect(compassDirection(225)).toBe("southwest");
    expect(compassDirection(270)).toBe("west");
    expect(compassDirection(315)).toBe("northwest");
  });

  it("wraps back to north near 360", () => {
    expect(compassDirection(359)).toBe("north");
    expect(compassDirection(360)).toBe("north");
  });

  it("survives out-of-range and negative bearings", () => {
    expect(compassDirection(-90)).toBe("west");
    expect(compassDirection(450)).toBe("east");
  });
});
