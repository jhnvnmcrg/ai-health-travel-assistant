import type { EnvironmentReading } from "../services/environmentService";
import type { SafetyVerdict } from "../ai/types";

/**
 * The `environmentalMetadata` written onto an assistant message: the tool's own
 * reading, plus the verdict the model reached about it.
 *
 * `locationName` is dropped rather than stored empty when the geocoder gave
 * nothing usable — an empty label renders as a blank line above the metric
 * strip. Shared by convex/chat.ts and convex/trips.ts, which both finish a
 * streaming message the same way.
 */
export function buildEnvironmentalMetadata(
  environment: EnvironmentReading | undefined,
  safetyVerdict: SafetyVerdict,
) {
  if (!environment) {
    return undefined;
  }

  const { locationName, ...reading } = environment;

  return {
    ...reading,
    ...(locationName ? { locationName } : {}),
    safetyVerdict,
  };
}
