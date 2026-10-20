/*
 * Generates the voiceover clips in public/audio/vo/ from src/voiceover.ts.
 *
 *   npm run voiceover
 *
 * It needs the app's own Gemini key. From the repository root:
 *
 *   export GEMINI_API_KEY=$(npx convex env get GEMINI_API_KEY)
 *
 * The whole script is read as ONE take and cut back into a clip per line.
 * Lines requested separately come back as separate announcements, each with
 * its own pitch and energy; read together they sound like one person talking.
 * The cuts land on silences: the take asks for a long pause between lines,
 * and splitIntoLines checks each cut against the script's text, so a take
 * that can't be matched is refused rather than cut mid-sentence.
 *
 * Takes vary. If one sounds off, run it again; the raw take is kept in
 * out/voiceover-take.wav for comparison.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES } from "../src/timeline.ts";
import { VO_LINES, VO_STYLE, VO_VOICE } from "../src/voiceover.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where AITravPH.tsx's FadeToBlack begins. */
const VIDEO_END_S = SCENES.end.from + SCENES.end.dur - 0.5;

const SILENCE_DB = -40;
const WINDOW_S = 0.02;
/** Shorter dips than this are inside a word, not between phrases. */
const MIN_GAP_S = 0.2;
/** Sentence pauses inside a line are tightened to this, to fit the scenes. */
const MAX_GAP_S = 0.35;
const PRE_ROLL_S = 0.05;
/** Generous, because a soft word ending sits under the silence threshold. */
const POST_ROLL_S = 0.15;
const PEAK = 10 ** (-1 / 20);

type Pcm = { samples: Float32Array; rate: number };
type Region = [start: number, end: number];

function readWav(buf: Buffer): Pcm {
  let offset = 12;
  let rate = 0;
  let channels = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(offset + 10);
      rate = buf.readUInt32LE(offset + 12);
      if (buf.readUInt16LE(offset + 22) !== 16) {
        throw new Error("Expected 16-bit PCM from the TTS model.");
      }
    }
    if (id === "data") {
      const frames = Math.floor(size / 2 / channels);
      const samples = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        // Mixed down to mono; the model returns mono anyway.
        let sum = 0;
        for (let c = 0; c < channels; c++) {
          sum += buf.readInt16LE(offset + 8 + (i * channels + c) * 2);
        }
        samples[i] = sum / channels / 32768;
      }
      return { samples, rate };
    }
    offset += 8 + size + (size & 1);
  }
  throw new Error("The TTS response was not a WAV file.");
}

function writeWav(path: string, { samples, rate }: Pcm) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => {
    const v = Math.max(-1, Math.min(1, s));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  });
  writeFileSync(path, buf);
}

/** Stretches of speech, in samples, separated by at least MIN_GAP_S. */
function speechRegions({ samples, rate }: Pcm): Region[] {
  const win = Math.round(rate * WINDOW_S);
  const minGap = Math.round(rate * MIN_GAP_S);
  const regions: Region[] = [];

  for (let i = 0; i < samples.length; i += win) {
    let energy = 0;
    const end = Math.min(samples.length, i + win);
    for (let j = i; j < end; j++) energy += samples[j] ** 2;
    const db = 10 * Math.log10(energy / (end - i) + 1e-12);
    if (db < SILENCE_DB) continue;

    const last = regions.at(-1);
    if (last && i - last[1] < minGap) last[1] = end;
    else regions.push([i, end]);
  }
  return regions;
}

/** How far a line's speech may stray from its share of the script's. */
const MAX_LENGTH_RATIO = 1.5;

/**
 * Groups the regions into one run per line. The longest gaps are the likely
 * line breaks, but the model sometimes pauses as long after a full stop as
 * between lines, so gap length alone picks the wrong one. Each line's speech
 * is also held against its share of the script's characters: a break in the
 * wrong place moves a whole sentence, leaving one line far too long and the
 * next far too short. The cuts are chosen to score best on both at once.
 */
function splitIntoLines(
  regions: Region[],
  texts: readonly string[],
  rate: number,
): Region[][] {
  const n = texts.length;
  const r = regions.length;
  if (r < n) {
    throw new Error(`Heard ${r} phrases for ${n} lines. Run it again.`);
  }

  // speech[k] is the speaking time, gaps excluded, of regions before k.
  const speech = [0];
  for (const [a, b] of regions) speech.push(speech.at(-1)! + (b - a) / rate);
  const chars = texts.map((t) => t.length);
  const perChar = speech[r] / chars.reduce((a, b) => a + b, 0);
  const strayOf = (line: number, from: number, to: number) =>
    Math.abs(Math.log((speech[to] - speech[from]) / (perChar * chars[line])));
  const gapBefore = (k: number) => (regions[k][0] - regions[k - 1][1]) / rate;

  // best[i][k]: the best score with the first i lines ending before region k.
  const best = Array.from({ length: n + 1 }, () =>
    new Array<number>(r + 1).fill(-Infinity),
  );
  const from = Array.from({ length: n + 1 }, () =>
    new Array<number>(r + 1).fill(0),
  );
  best[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let k = i; k <= r - (n - i); k++) {
      for (let j = i - 1; j < k; j++) {
        if (best[i - 1][j] === -Infinity) continue;
        // A break earns its gap, in seconds; a line pays for straying.
        const score =
          best[i - 1][j] + (j > 0 ? gapBefore(j) : 0) - strayOf(i - 1, j, k);
        if (score > best[i][k]) {
          best[i][k] = score;
          from[i][k] = j;
        }
      }
    }
  }

  const bounds = [r];
  for (let i = n; i > 0; i--) bounds.unshift(from[i][bounds[0]]);
  const groups = texts.map((_, i) => regions.slice(bounds[i], bounds[i + 1]));

  texts.forEach((text, i) => {
    if (strayOf(i, bounds[i], bounds[i + 1]) > Math.log(MAX_LENGTH_RATIO)) {
      throw new Error(
        `Couldn't match the take to the script at "${text}". Run it again.`,
      );
    }
  });
  return groups;
}

/** One line's audio, with its sentence pauses tightened and its ends faded. */
function cutLine(take: Pcm, regions: Region[]): Float32Array {
  const { samples, rate } = take;
  const s = (seconds: number) => Math.round(seconds * rate);
  const pieces: Float32Array[] = [];

  let start = Math.max(0, regions[0][0] - s(PRE_ROLL_S));
  for (let i = 0; i < regions.length - 1; i++) {
    const end = regions[i][1];
    const next = regions[i + 1][0];
    if (next - end <= s(MAX_GAP_S)) continue;
    // Keep half the allowed pause after this phrase and half before the next.
    pieces.push(samples.subarray(start, end + s(MAX_GAP_S / 2)));
    start = next - s(MAX_GAP_S / 2);
  }
  const last = regions.at(-1)![1];
  pieces.push(
    samples.subarray(start, Math.min(samples.length, last + s(POST_ROLL_S))),
  );

  const clip = new Float32Array(pieces.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    clip.set(piece, offset);
    offset += piece.length;
  }

  const fadeIn = s(0.008);
  const fadeOut = s(0.05);
  for (let i = 0; i < fadeIn; i++) clip[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) clip[clip.length - 1 - i] *= i / fadeOut;
  return clip;
}

/** One take of the whole script, as a WAV. */
async function readScript(): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. From the repository root: export GEMINI_API_KEY=$(npx convex env get GEMINI_API_KEY)",
    );
  }

  // Paragraph breaks as well as the pause tag: the tag alone came back with
  // line breaks barely longer than the pause after a full stop.
  const script = VO_LINES.map((line) => line.text).join("\n\n<long pause>\n\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: "gemini-3.8-flash-tts",
        input: [
          {
            type: "user_input",
            content: [
              {
                type: "text",
                text: script,
                annotations: [
                  {
                    type: "speech_metadata",
                    style: `${VO_STYLE} Take a long, unhurried breath between paragraphs.`,
                  },
                ],
              },
            ],
          },
        ],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice: VO_VOICE }] },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }

  const interaction = (await response.json()) as {
    steps?: { content?: { type: string; data?: string }[] }[];
  };
  const audio = interaction.steps
    ?.flatMap((step) => step.content ?? [])
    .find((part) => part.type === "audio" && part.data);
  if (!audio?.data) throw new Error("Gemini returned no audio.");
  return Buffer.from(audio.data, "base64");
}

async function main() {
  const wav = await readScript();

  mkdirSync(join(ROOT, "out"), { recursive: true });
  writeFileSync(join(ROOT, "out", "voiceover-take.wav"), wav);

  const take = readWav(wav);
  const groups = splitIntoLines(
    speechRegions(take),
    VO_LINES.map((line) => line.text),
    take.rate,
  );
  const clips = groups.map((regions) => cutLine(take, regions));

  // One gain for every clip, so the take's own dynamics between lines survive.
  const peak = Math.max(
    ...clips.map((c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), 0)),
  );
  const gain = PEAK / peak;

  const dir = join(ROOT, "public", "audio", "vo");
  mkdirSync(dir, { recursive: true });
  const durations: Record<string, number> = {};

  VO_LINES.forEach((line, i) => {
    const samples = clips[i].map((v) => v * gain);
    writeWav(join(dir, `${line.id}.wav`), { samples, rate: take.rate });
    durations[line.id] = Math.round((samples.length / take.rate) * 100) / 100;
  });

  writeFileSync(
    join(ROOT, "src", "vo-durations.ts"),
    [
      "// Generated by `npm run voiceover`: each clip's length, in seconds.",
      'import type { VoLineId } from "./voiceover";',
      "",
      "export const VO_DURATIONS: Record<VoLineId, number> = {",
      ...VO_LINES.map((line) => `  ${line.id}: ${durations[line.id]},`),
      "};",
      "",
    ].join("\n"),
  );

  console.log(`Take: ${(take.samples.length / take.rate).toFixed(2)}s\n`);
  VO_LINES.forEach((line, i) => {
    const end = line.at + durations[line.id];
    const limit = VO_LINES[i + 1]?.at ?? VIDEO_END_S;
    const warning =
      end > limit ? `  ⚠ runs ${(end - limit).toFixed(2)}s past ${limit}s` : "";
    console.log(
      `${line.id.padEnd(7)} ${line.at.toFixed(2)}s → ${end.toFixed(2)}s  (${durations[line.id].toFixed(2)}s)${warning}`,
    );
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  // Not process.exit(): on Windows that can abort Node while fetch's sockets
  // are still closing.
  process.exitCode = 1;
});
