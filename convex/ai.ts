import { action } from "./_generated/server";
import { v } from "convex/values";
import { gemini } from "./lib/gemini";

export const generateResponse = action({
  args: {
    prompt: v.string(),
  },

  handler: async (_, { prompt }) => {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text ?? "I'm sorry, I couldn't generate a response.";
  },
});
