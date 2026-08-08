import type { AIResponse, SafetyVerdict } from "./types";

/**
 * The reply is plain prose behind a single header line, not JSON.
 *
 * That is what makes it streamable: JSON would have to arrive complete before
 * any of the advice could be shown, whereas here the header settles in the
 * first few tokens and everything after it is the answer. It also removes a
 * whole class of failure — there is no brace matching to get wrong, and no
 * "the model wrote a trailing comma so the health advice is unparseable".
 *
 * Requiring the newline matters for the streaming gate in
 * convex/ai/generate.ts: without it a half-arrived "Safe" could be the start
 * of "Safety depends on...".
 */
const HEADER_PATTERN =
  /^[ \t]*SAFETY[_ ]?VERDICT[ \t]*:[ \t]*(Safe|Caution|High[ _]Risk)[ \t]*\r?\n/i;

const LEADING_FENCE_PATTERN = /^\s*```[a-z]*[ \t]*\r?\n/i;
const TRAILING_FENCE_PATTERN = /\r?\n[ \t]*```[ \t]*$/;

export type VerdictHeader = {
  verdict: SafetyVerdict;
  /** Where the advice starts, as an index into the string that was tested. */
  endIndex: number;
};

function canonicalVerdict(raw: string): SafetyVerdict {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, " ");

  if (normalized === "safe") return "Safe";
  if (normalized === "high risk") return "High Risk";

  return "Caution";
}

/**
 * Strips an opening code fence only. Used while streaming, when the closing
 * fence has not arrived yet and may never.
 */
export function stripLeadingFence(text: string): string {
  return text.replace(LEADING_FENCE_PATTERN, "");
}

/** Matches the header at the very start of `text`, or returns null. */
export function readVerdictHeader(text: string): VerdictHeader | null {
  const match = HEADER_PATTERN.exec(text);

  if (!match) {
    return null;
  }

  return {
    verdict: canonicalVerdict(match[1]),
    endIndex: match[0].length,
  };
}

export function parseAIResponse(rawText: string): AIResponse {
  const text = stripLeadingFence(rawText)
    .replace(TRAILING_FENCE_PATTERN, "")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const header = readVerdictHeader(`${text}\n`);

  if (!header) {
    console.warn("AI response had no SAFETY_VERDICT header. Falling back.");

    // Advice we could not classify is never labelled "Safe".
    return { advice: text, safetyVerdict: "Caution" };
  }

  const advice = text.slice(header.endIndex).trim();

  if (!advice) {
    throw new Error("Gemini returned a verdict with no advice.");
  }

  return { advice, safetyVerdict: header.verdict };
}
