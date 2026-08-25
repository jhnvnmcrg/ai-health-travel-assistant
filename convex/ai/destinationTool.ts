import { FunctionDeclaration, Type } from "@google/genai";

/**
 * The name is load-bearing, not cosmetic.
 *
 * A model narrates its own tool calls, and the call is replayed into its
 * context on every later turn. `get_directions` licenses the opening clause
 * "here are the directions" — and once that clause is written the model has to
 * fill it, from the tool result if it can and from world knowledge if it
 * cannot. `show_destination_on_map` has no verb that completes into a
 * turn-by-turn: its natural paraphrase is "I've put a map card below", which
 * is the sentence this feature wants. `get_route` and `navigate_to` fail the
 * same way and were rejected for the same reason.
 */
export const destinationTool: FunctionDeclaration = {
  name: "show_destination_on_map",
  description:
    "Put a tappable Google Maps card under your reply for a place the traveller is trying to reach. It resolves the place and returns a pin — the matched name and its province — plus the straight-line distance when they have said where they are. It does NOT return a route, a road distance or a travel time, and you have no other source for those: never describe how to get there. Use it when they name somewhere they want to go and ask how to reach it or where it is. Do not call it just because a place was mentioned. Do not call it when they cannot say where they are, or are lost, hurt or frightened — that is find_safe_places, and it comes after checking whether they should call 911 or stay put.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      destination: {
        type: Type.STRING,
        description:
          'Where they want to go, as they would say it, and specific enough to find on a map. Examples: Burnham Park, SM City Davao, Cateel District Hospital. A common noun is not a place — if they said "my hotel", "the market" or "the terminal", ask which one and send the name they give you.',
      },
      origin: {
        type: Type.STRING,
        description:
          "Where they said they are, when they named a street, barangay or landmark rather than sharing coordinates. Optional — map the destination anyway when they have not said, and do not ask first.",
      },
      originLatitude: {
        type: Type.NUMBER,
        description:
          "Their latitude when the message carries a coordinate pair from the map-pin button. Prefer this over origin. Send with originLongitude.",
      },
      originLongitude: {
        type: Type.NUMBER,
        description:
          "Their longitude when the message carries a coordinate pair from the map-pin button. Send with originLatitude.",
      },
    },

    // Only the destination. The origin is genuinely optional: the Maps link
    // never carries one, so demanding it would spend a whole round trip on a
    // question whose only product is a distance label.
    required: ["destination"],
  },
};
