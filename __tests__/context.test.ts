import { describe, expect, it } from "vitest";
import type { Content, Part } from "@google/genai";
import { appendToolResults, buildGeminiContents } from "@/convex/ai/context";

const HISTORY: Content[] = [
  { role: "user", parts: [{ text: "Is Baguio safe today?" }] },
];

/** What a Gemini 3 tool-calling turn actually looks like coming off the wire. */
const MODEL_PARTS: Part[] = [
  { text: "Let me check.", thought: true, thoughtSignature: "sig-thought" },
  {
    functionCall: {
      id: "call-1",
      name: "fetch_location_environment_data",
      args: { location: "Baguio" },
    },
    thoughtSignature: "sig-call-1",
  },
];

describe("buildGeminiContents", () => {
  it("maps assistant to the model role", () => {
    expect(
      buildGeminiContents([
        { role: "user", text: "hi" },
        { role: "assistant", text: "hello" },
      ]),
    ).toEqual([
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "hello" }] },
    ]);
  });
});

describe("appendToolResults", () => {
  it("replays the model's parts verbatim, keeping thought signatures", () => {
    // Regression: rebuilding this turn from the FunctionCall objects drops
    // `thoughtSignature` (it lives on the Part, not the call), and Gemini 3
    // rejects the next request with 400 "missing a thought_signature".
    const [, modelTurn] = appendToolResults(HISTORY, MODEL_PARTS, [
      { name: "fetch_location_environment_data", id: "call-1", result: {} },
    ]);

    expect(modelTurn.role).toBe("model");
    expect(modelTurn.parts).toBe(MODEL_PARTS);
    expect(modelTurn.parts?.[1].thoughtSignature).toBe("sig-call-1");
  });

  it("echoes the call id so parallel calls to one tool stay distinct", () => {
    const [, , responseTurn] = appendToolResults(HISTORY, MODEL_PARTS, [
      {
        name: "fetch_location_environment_data",
        id: "call-1",
        result: { a: 1 },
      },
      {
        name: "fetch_location_environment_data",
        id: "call-2",
        result: { a: 2 },
      },
    ]);

    expect(
      responseTurn.parts?.map((part) => part.functionResponse?.id),
    ).toEqual(["call-1", "call-2"]);
  });

  it("omits the id entirely when the model did not supply one", () => {
    const [, , responseTurn] = appendToolResults(HISTORY, MODEL_PARTS, [
      { name: "search_nearby_hospitals", result: { hospitals: [] } },
    ]);

    expect(responseTurn.parts?.[0].functionResponse).not.toHaveProperty("id");
  });

  it("wraps a non-object tool result so the response is always a struct", () => {
    const [, , responseTurn] = appendToolResults(HISTORY, MODEL_PARTS, [
      { name: "search_nearby_hospitals", result: [1, 2] },
    ]);

    expect(responseTurn.parts?.[0].functionResponse?.response).toEqual({
      result: [1, 2],
    });
  });

  it("leaves the incoming history untouched", () => {
    appendToolResults(HISTORY, MODEL_PARTS, [{ name: "x", result: {} }]);

    expect(HISTORY).toHaveLength(1);
  });
});
