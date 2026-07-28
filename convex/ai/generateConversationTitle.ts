import { gemini } from "./client";

export async function generateConversationTitle(
  firstMessage: string,
): Promise<string> {
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",

    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Create a very short title (maximum 5 words) for this travel health conversation.

Only return the title.

Message:

${firstMessage}`,
          },
        ],
      },
    ],
  });

  return response.text?.trim() ?? "New Conversation";
}
