import { FunctionDeclaration, Type } from "@google/genai";

export const safePlacesTool: FunctionDeclaration = {
  name: "find_safe_places",
  description:
    "Find real, mapped places a lost or disoriented traveller can head towards — nearby towns and villages, police stations, hospitals and transport hubs — within about 15km of a coordinate. Returns destinations only; it does not return a route. Use it when the user is lost, unsure which way to go, or wants to get back to somewhere safe.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      latitude: {
        type: Type.NUMBER,
        description: "The traveller's current latitude.",
      },
      longitude: {
        type: Type.NUMBER,
        description: "The traveller's current longitude.",
      },
    },
    required: ["latitude", "longitude"],
  },
};
