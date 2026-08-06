import type { AIResponse } from "./types";

const SAFETY_VERDICTS = ["Safe", "Caution", "High Risk"];

const DEFAULT_DISCLAIMER =
  "This information is for educational purposes only and is not a substitute for professional medical advice. Consult a licensed healthcare professional for medical concerns.";

export function parseAIResponse(rawText: string): AIResponse {
  const text = rawText.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const withoutFences = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  const candidate =
    firstBrace !== -1 && lastBrace > firstBrace
      ? withoutFences.slice(firstBrace, lastBrace + 1)
      : withoutFences;

  let parsed: unknown;

  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    console.warn(
      "AI response was plain text, not JSON. Falling back:",
      rawText,
    );
    return {
      advice: text,
      // Unparseable health advice defaults to "Caution", never "Safe".
      safetyVerdict: "Caution",
      medicalDisclaimer: DEFAULT_DISCLAIMER,
    };
  }

  const isValidShape =
    parsed &&
    typeof parsed === "object" &&
    typeof (parsed as Record<string, unknown>).advice === "string" &&
    SAFETY_VERDICTS.includes(
      (parsed as Record<string, unknown>).safetyVerdict as string,
    );

  if (!isValidShape) {
    console.warn("AI response missing required fields. Falling back:", parsed);
    return {
      advice: text,
      // Unparseable health advice defaults to "Caution", never "Safe".
      safetyVerdict: "Caution",
      medicalDisclaimer: DEFAULT_DISCLAIMER,
    };
  }

  const result = parsed as AIResponse;

  if (!result.medicalDisclaimer) {
    result.medicalDisclaimer = DEFAULT_DISCLAIMER;
  }

  return result;
}
