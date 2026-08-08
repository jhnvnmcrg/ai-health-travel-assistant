import { describe, expect, it } from "vitest";
import {
  parseAIResponse,
  readVerdictHeader,
  stripLeadingFence,
} from "@/convex/ai/parseResponse";

describe("readVerdictHeader", () => {
  it("reads a well-formed header", () => {
    expect(readVerdictHeader("SAFETY_VERDICT: Caution\nrest")).toEqual({
      verdict: "Caution",
      endIndex: "SAFETY_VERDICT: Caution\n".length,
    });
  });

  it("requires the newline, so a half-streamed verdict is not acted on", () => {
    // This is the streaming gate: "Safe" here could still turn out to be the
    // beginning of "Safety depends on...".
    expect(readVerdictHeader("SAFETY_VERDICT: Safe")).toBeNull();
    expect(readVerdictHeader("SAFETY_VERDICT: Saf")).toBeNull();
  });

  it("only matches at the very start", () => {
    expect(readVerdictHeader("Here you go\nSAFETY_VERDICT: Safe\n")).toBeNull();
  });

  it("accepts the spacing and casing a model actually produces", () => {
    expect(
      readVerdictHeader("safety verdict:  high risk  \r\nx")?.verdict,
    ).toBe("High Risk");
    expect(readVerdictHeader("SAFETY_VERDICT:High_Risk\nx")?.verdict).toBe(
      "High Risk",
    );
  });
});

describe("stripLeadingFence", () => {
  it("removes an opening fence with or without a language tag", () => {
    expect(stripLeadingFence("```\nbody")).toBe("body");
    expect(stripLeadingFence("```text\nbody")).toBe("body");
  });

  it("leaves unfenced text alone", () => {
    expect(stripLeadingFence("body")).toBe("body");
  });
});

describe("parseAIResponse", () => {
  it("splits the verdict from the advice", () => {
    const result = parseAIResponse(
      "SAFETY_VERDICT: High Risk\n\nHeat index is 43°C. Do not hike today.",
    );

    expect(result).toEqual({
      safetyVerdict: "High Risk",
      advice: "Heat index is 43°C. Do not hike today.",
    });
  });

  it("survives the model wrapping the whole reply in a fence", () => {
    const result = parseAIResponse(
      "```\nSAFETY_VERDICT: Safe\n\nConditions look fine.\n```",
    );

    expect(result.safetyVerdict).toBe("Safe");
    expect(result.advice).toBe("Conditions look fine.");
  });

  it("never labels unparseable advice as Safe", () => {
    // The whole point of the fallback: an unrecognised reply is still shown,
    // but it is not allowed to claim the conditions are fine.
    const result = parseAIResponse("Sure! Baguio is lovely this time of year.");

    expect(result.safetyVerdict).toBe("Caution");
    expect(result.advice).toBe("Sure! Baguio is lovely this time of year.");
  });

  it("does not read a verdict out of the middle of the prose", () => {
    const result = parseAIResponse(
      "It depends.\nSAFETY_VERDICT: Safe\nbut check again tomorrow.",
    );

    expect(result.safetyVerdict).toBe("Caution");
  });

  it("throws on an empty reply", () => {
    expect(() => parseAIResponse("   \n  ")).toThrow();
  });

  it("throws on a verdict with no advice behind it", () => {
    expect(() => parseAIResponse("SAFETY_VERDICT: Safe\n\n")).toThrow();
  });
});
