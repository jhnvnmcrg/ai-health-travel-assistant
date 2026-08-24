import { FunctionDeclaration, Type } from "@google/genai";

export const environmentTool: FunctionDeclaration = {
  name: "fetch_location_environment_data",
  description:
    "Retrieve real-time environmental information (temperature, humidity, heat index, UV, rain probability, PM2.5, PM10, elevation) for a Philippine location. Give EITHER a place name OR a latitude/longitude pair. Prefer the coordinates whenever the user has supplied them, because a place name resolves to the centre of that town, which may be kilometres from where they actually are.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description:
          "A place name, used when the user named somewhere rather than sharing coordinates. Examples: Lake Sebu, Mount Apo, Davao City, Baguio.",
      },
      latitude: {
        type: Type.NUMBER,
        description:
          "Latitude, when the user shared coordinates. Must be sent together with longitude.",
      },
      longitude: {
        type: Type.NUMBER,
        description:
          "Longitude, when the user shared coordinates. Must be sent together with latitude.",
      },
    },

    // Nothing is individually required — the action rejects a call that
    // supplies neither a name nor a complete coordinate pair.
    required: [],
  },
};
