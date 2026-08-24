import { FunctionDeclaration, Type } from "@google/genai";

export const tripTool: FunctionDeclaration = {
  name: "save_trip",
  description:
    "Remember a trip the traveller has told you they are taking, so the app can remind them the day before with fresh conditions. Call this whenever they mention going somewhere on a specific date — even in passing, and even if their main question was about something else. Resolve their wording ('11 September', 'next Friday') into a calendar date yourself using today's date, which is given in your instructions.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      destination: {
        type: Type.STRING,
        description:
          "Where they are going, as they would say it. Examples: Lake Sebu, Mount Apo, Siargao.",
      },
      tripDate: {
        type: Type.STRING,
        description:
          "The date of the trip as YYYY-MM-DD, in Philippine local time. Must be a real calendar date; it is validated and rejected if not.",
      },
    },
    required: ["destination", "tripDate"],
  },
};
