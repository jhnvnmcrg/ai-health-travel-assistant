import { describe, expect, it } from "vitest";
import { pickDestinationPin } from "@/convex/ai/attribution";

const PIN = { destination: { name: "Burnham Park" } };
const OTHER = { destination: { name: "Rizal Park" } };

describe("pickDestinationPin", () => {
  it("renders a single pin from a single lookup", () => {
    expect(pickDestinationPin([PIN], 1, 0)).toBe(PIN);
  });

  it("renders nothing when no lookup was made", () => {
    expect(pickDestinationPin([], 0, 0)).toBeUndefined();
  });

  it("renders nothing for two destinations in one turn", () => {
    // One reply carries one card; picking either would choose a leg the
    // traveller never named.
    expect(pickDestinationPin([PIN, OTHER], 2, 0)).toBeUndefined();
  });

  it("counts attempts, so a failed second lookup still suppresses", () => {
    // "How do I get to Sagada, then Banaue" where Banaue's geocode throws
    // leaves one resolved pin. Rendering it would label a card Sagada under
    // advice covering both legs.
    expect(pickDestinationPin([PIN], 2, 0)).toBeUndefined();
  });

  it("suppresses whenever the turn also went looking for refuges", () => {
    // "Head here for safety" above "here is your route to the beach" is the
    // mixed message that gets somebody hurt at dusk.
    expect(pickDestinationPin([PIN], 1, 1)).toBeUndefined();
  });

  it("suppresses on a refuge search that failed, not just one that found something", () => {
    // The regression this test exists for. Keying the guard on captured
    // searches instead of attempts left the card enabled whenever
    // find_safe_places threw — an Overpass outage returns an empty list, but a
    // malformed call throws and captures nothing at all. Both mean the model
    // judged this traveller possibly lost.
    expect(pickDestinationPin([PIN], 1, 1)).toBeUndefined();
    expect(pickDestinationPin([PIN], 1, 2)).toBeUndefined();
  });

  it("suppresses even when the refuge search is the only thing that ran", () => {
    expect(pickDestinationPin([], 0, 1)).toBeUndefined();
  });
});
