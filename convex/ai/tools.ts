import { FunctionDeclaration, Type } from "@google/genai";

export const environmentTool: FunctionDeclaration = {
  name: "fetch_location_environment_data",

  description:
    "Retrieve real-time environmental information for a Philippine location.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      location: {
        type: Type.STRING,

        description:
          "The location specified by the user. Examples: Lake Sebu, Mount Apo, Davao City, Baguio.",
      },
    },

    required: ["location"],
  },
};
