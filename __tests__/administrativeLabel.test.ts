import { describe, expect, it } from "vitest";
import { administrativeLabel } from "@/convex/services/environmentService";

/**
 * The label is what tells a traveller in Batangas that they have been handed
 * the Nueva Ecija match, so these are pinned to real Nominatim `display_name`
 * strings rather than to whatever the implementation happened to return.
 */
describe("administrativeLabel", () => {
  it("drops the place's own name, the postcode and the country", () => {
    expect(
      administrativeLabel(
        "Burnham Park, Baguio, Benguet, Cordillera Administrative Region, 2600, Philippines",
        "Burnham Park",
      ),
    ).toBe("Baguio, Benguet");
  });

  it("drops a region when a province survives without it", () => {
    // "Benguet" is what somebody recognises; "Cordillera Administrative
    // Region" is four words that place nothing.
    expect(
      administrativeLabel(
        "Baguio, Benguet, Cordillera Administrative Region, 2600, Philippines",
        "Baguio",
      ),
    ).toBe("Benguet");
  });

  it("keeps the region when it is the only context there is", () => {
    expect(
      administrativeLabel(
        "Quezon City, National Capital Region, 1100, Philippines",
        "Quezon City",
      ),
    ).toBe("National Capital Region");
  });

  it("distinguishes two places that share a name", () => {
    const nuevaEcija = administrativeLabel(
      "San Jose, Nueva Ecija, Central Luzon, 3121, Philippines",
      "San Jose",
    );
    const batangas = administrativeLabel(
      "San Jose, Batangas, Calabarzon, 4227, Philippines",
      "San Jose",
    );

    // The province leads, which is the part that disambiguates. Region names
    // that do not contain the word "Region" — Central Luzon, Calabarzon,
    // Mimaropa — survive as the second segment, which is harmless.
    expect(nuevaEcija).toBe("Nueva Ecija, Central Luzon");
    expect(batangas).toBe("Batangas, Calabarzon");
    expect(nuevaEcija).not.toBe(batangas);
  });

  it("returns an empty string rather than a stray comma when there is no context", () => {
    // An empty label is dropped by the caller; a ", " would render as a blank
    // line under the name.
    expect(administrativeLabel("Philippines", "Philippines")).toBe("");
    expect(administrativeLabel("", "Anything")).toBe("");
  });

  it("keeps at most two segments so the line fits the card", () => {
    const label = administrativeLabel(
      "Some Place, Barangay One, Municipality Two, Province Three, 1234, Philippines",
      "Some Place",
    );

    expect(label.split(",")).toHaveLength(2);
  });
});
