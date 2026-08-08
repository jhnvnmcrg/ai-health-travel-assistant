/**
 * Everything the model is asked to produce.
 *
 * The environmental numbers and the hospital list used to be in here too, and
 * the model had to copy them out of the tool results into its own reply. They
 * are now captured straight from the tool results by
 * convex/ai/orchestrator.ts, so an LLM never re-types a heat index or a
 * hospital's coordinates. What is left is the judgement — which is the part a
 * model is actually for.
 */
export interface AIResponse {
  safetyVerdict: SafetyVerdict;
  advice: string;
}

export type SafetyVerdict = "Safe" | "Caution" | "High Risk";

export type Hospital = {
  name: string;
  latitude: number;
  longitude: number;
};
