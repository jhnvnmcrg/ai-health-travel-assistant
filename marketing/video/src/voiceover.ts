import { SCENES } from "./timeline.ts";

/**
 * The voiceover script, one entry per clip. `at` is where the clip starts, in
 * seconds from the top of the video, set against the scene it narrates.
 *
 * `npm run voiceover` reads the whole script as one take and cuts it back into
 * public/audio/vo/<id>.wav, recording each clip's length in vo-durations.ts.
 * Editing a line's text means regenerating; nudging its `at` does not.
 *
 * Imports nothing but the timeline, so the generator can load it under plain
 * Node.
 */
export const VO_LINES = [
  {
    id: "hook",
    // Ends just before the logo's reveal hit.
    at: SCENES.hook.from + 0.1,
    text: "Seven thousand islands. Forty-degree heat. Is it safe to go?",
  },
  {
    id: "logo",
    at: SCENES.logo.from + 0.15,
    // Spelled with stops so it is read as letters: "A-I Trav".
    text: "Meet A.I. Trav — your AI travel-health advisor for the Philippines.",
  },
  {
    id: "ask",
    // Just after the send tap in the first chat.
    at: SCENES.ask.from + 2.3,
    text: "Ask about anywhere you’re headed. It checks live conditions against your own health.",
  },
  {
    id: "lost",
    // Starts while the question is typed, so "one tap" comes just ahead of
    // the tap on the first safe place.
    at: SCENES.lost.from + 0.9,
    text: "Lost on a trail? It finds the nearest safe place, and one tap opens Google Maps.",
  },
  {
    id: "remind",
    at: SCENES.remind.from + 0.3,
    text: "Save a trip, and get fresh advice the night before.",
  },
  {
    id: "end",
    at: SCENES.end.from + 0.4,
    text: "A.I. Trav. Know before you go.",
  },
] as const;

export type VoLineId = (typeof VO_LINES)[number]["id"];

/** Gemini TTS voice and the direction it reads the whole script under. */
export const VO_VOICE = "sulafat";
export const VO_STYLE =
  "A natural, conversational commercial read, like a trusted friend who knows the Philippines well. Warm and human, with a smile in the voice; varied pitch and relaxed phrasing, never announcer-y. The opening is quieter and intriguing, the brand name is said with quiet pride, and the final line is warm and conclusive.";
