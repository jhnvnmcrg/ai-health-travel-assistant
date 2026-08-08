import { describe, expect, it } from "vitest";
import { calculateHeatIndex } from "@/convex/utils/heatIndex";

/**
 * Checked against the NWS heat index table, converted to Celsius. This is the
 * number the assistant's headline warning keys off in a tropical climate, so
 * it is worth pinning to the published values rather than to whatever the
 * implementation happened to return the day it was written.
 */
describe("calculateHeatIndex", () => {
  it("matches the NWS table at 90°F / 70% (≈106°F)", () => {
    // 32.2°C ≈ 90°F, 106°F ≈ 41.1°C
    expect(calculateHeatIndex(32.2, 70)).toBeCloseTo(41.1, 0);
  });

  it("matches the NWS table at 100°F / 40% (≈109°F)", () => {
    // 37.8°C ≈ 100°F, 109°F ≈ 42.8°C
    expect(calculateHeatIndex(37.8, 40)).toBeCloseTo(42.9, 0);
  });

  it("matches the NWS table at 80°F / 40% (≈80°F)", () => {
    // Below the regression's threshold, so the simple formula applies.
    expect(calculateHeatIndex(26.7, 40)).toBeCloseTo(26.6, 0);
  });

  it("stays near the air temperature when it is mild", () => {
    expect(calculateHeatIndex(20, 40)).toBeCloseTo(20, -1);
  });

  it("rises with humidity at a fixed temperature", () => {
    const dry = calculateHeatIndex(35, 10);
    const humid = calculateHeatIndex(35, 50);
    const soaked = calculateHeatIndex(35, 90);

    expect(dry).toBeLessThan(humid);
    expect(humid).toBeLessThan(soaked);
  });

  it("feels hotter than the air when it is hot and humid", () => {
    expect(calculateHeatIndex(32.2, 70)).toBeGreaterThan(32.2);
  });

  it("returns one decimal place", () => {
    const value = calculateHeatIndex(31.4159, 62.7);

    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBe(Number(value.toFixed(1)));
  });
});
