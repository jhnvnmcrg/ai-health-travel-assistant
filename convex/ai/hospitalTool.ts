import { FunctionDeclaration, Type } from "@google/genai";

export const hospitalTool: FunctionDeclaration = {
  name: "search_nearby_hospitals",
  description: "Search nearby hospitals using latitude and longitude.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      latitude: {
        type: Type.NUMBER,
      },
      longitude: {
        type: Type.NUMBER,
      },
    },
    required: ["latitude", "longitude"],
  },
};
