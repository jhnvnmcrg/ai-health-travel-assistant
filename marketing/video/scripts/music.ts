/*
 * Synthesises the music bed: public/audio/music.mp3.
 *
 *   npm run music
 *
 * The score is code rather than a library track so that it is cut to this
 * video. The tempo is solved so a whole number of bars spans the logo's
 * reveal to the end card, which puts the reveal hit on the logo and the
 * final chord on the end card exactly; the groove enters with the first
 * chat and the lift with the reminder. All of it is read from
 * src/timeline.ts, so after moving a scene, run this again.
 *
 * It is deterministic — the same script always writes the same file — and
 * needs no key and no network. The MP3 is encoded with the ffmpeg that
 * ships with Remotion.
 *
 * In D major: D – Bm – G – A under the chats, G – A into a final D.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENES } from "../src/timeline.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 44100;
const LENGTH_S = SCENES.end.from + SCENES.end.dur;
const N = Math.ceil(LENGTH_S * SR);

// ── The grid ────────────────────────────────────────────────────────────────

const REVEAL = SCENES.logo.from;
const RESOLVE = SCENES.end.from;
/** About 112 BPM, stretched so the reveal-to-resolve span is whole bars. */
const BAR = (RESOLVE - REVEAL) / Math.round((RESOLVE - REVEAL) / 2.15);
const STEP = BAR / 16;
/** Bar 0 is the reveal; the intro bars are negative. */
const bar = (k: number) => REVEAL + k * BAR;
/** Off-sixteenths land a little late: a light swing, so it doesn't march. */
const at = (k: number, step: number) =>
  bar(k) + (step + (step % 2 ? 0.14 : 0)) * STEP;
const barOf = (seconds: number) => Math.round((seconds - REVEAL) / BAR);

const GROOVE_BAR = barOf(SCENES.ask.from);
const LIFT_BAR = barOf(SCENES.remind.from);
const END_BAR = barOf(RESOLVE);
const FIRST_BAR = -Math.floor(REVEAL / BAR);

// ── Harmony ─────────────────────────────────────────────────────────────────

const NAMES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function midi(note: string): number {
  const [, letter, accidental, octave] = /^([A-G])(#|b)?(-?\d)$/.exec(note)!;
  const shift = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  return 12 * (Number(octave) + 1) + NAMES[letter] + shift;
}

const notes = (list: string) => list.split(" ").map(midi);
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

type Chord = { bass: number; pad: number[]; arp: number[]; strings: number[] };

/**
 * Voiced to move by step with common tones held, and kept low and close so
 * the pads sit under the voiceover rather than beside it.
 */
const CHORDS = {
  D: {
    bass: midi("D2"),
    pad: notes("F#3 A3 C#4 E4"),
    arp: notes("A4 D5 E5 F#5 A5"),
    strings: notes("A4 D5 F#5"),
  },
  Bm: {
    bass: midi("B1"),
    pad: notes("F#3 A3 D4 E4"),
    arp: notes("A4 B4 D5 F#5 A5"),
    strings: notes("B4 D5 F#5"),
  },
  G: {
    bass: midi("G1"),
    pad: notes("F#3 A3 B3 D4"),
    arp: notes("A4 B4 D5 G5 A5"),
    strings: notes("B4 D5 F#5"),
  },
  Asus: {
    bass: midi("A1"),
    pad: notes("E3 A3 B3 D4"),
    arp: notes("A4 B4 D5 E5 A5"),
    strings: notes("A4 D5 E5"),
  },
  A: {
    bass: midi("A1"),
    pad: notes("E3 A3 C#4 E4"),
    arp: notes("A4 B4 C#5 E5 A5"),
    strings: notes("A4 C#5 E5"),
  },
  // The intro: B minor with an added ninth rubbing against the third.
  BmAdd9: {
    bass: midi("B1"),
    pad: notes("B2 F#3 C#4 D4"),
    arp: [],
    strings: [],
  },
  GLow: { bass: midi("G1"), pad: notes("G2 D3 A3 B3"), arp: [], strings: [] },
  AsusLow: {
    bass: midi("A1"),
    pad: notes("A2 E3 A3 D4"),
    arp: [],
    strings: [],
  },
} satisfies Record<string, Chord>;

type ChordName = keyof typeof CHORDS;

const PROGRESSION: ChordName[][] = [["D"], ["Bm"], ["G"], ["Asus", "A"]];

/** The bar's chords, each taking an equal share of it. */
function chordsIn(k: number): ChordName[] {
  if (k < -1) return ["BmAdd9"];
  if (k === -1) return ["GLow", "AsusLow"];
  if (k >= END_BAR) return ["D"];
  if (k === END_BAR - 1) return ["Asus", "A"];
  if (k === END_BAR - 2) return ["G"];
  return PROGRESSION[k % PROGRESSION.length];
}

function chordAt(k: number, step: number): Chord {
  const names = chordsIn(k);
  return CHORDS[names[Math.floor((step / 16) * names.length)]];
}

// ── Plumbing ────────────────────────────────────────────────────────────────

type Bus = { l: Float32Array; r: Float32Array };
const bus = (): Bus => ({ l: new Float32Array(N), r: new Float32Array(N) });

/** Seeded, so every render is identical. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(7641);
const noise = () => random() * 2 - 1;

/** Equal-power pan: -1 is hard left. */
function panGains(pan: number): [number, number] {
  const angle = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}

/** Writes `seconds` of a mono voice into `b`, starting at `t0`. */
function render(
  b: Bus,
  t0: number,
  seconds: number,
  pan: number,
  voice: (t: number, i: number) => number,
) {
  const start = Math.round(t0 * SR);
  const [gl, gr] = panGains(pan);
  const end = Math.min(N, start + Math.round(seconds * SR));
  for (let i = Math.max(0, start); i < end; i++) {
    const v = voice((i - start) / SR, i);
    b.l[i] += v * gl;
    b.r[i] += v * gr;
  }
}

/** Topology-preserving state-variable filter (Zavalishin). */
class Filter {
  low = 0;
  band = 0;
  high = 0;
  private ic1 = 0;
  private ic2 = 0;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private k = 1;

  constructor(cutoff = 1000, q = 0.707) {
    this.tune(cutoff, q);
  }

  tune(cutoff: number, q = 0.707) {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
    this.k = 1 / q;
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  run(v0: number) {
    const v3 = v0 - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = v0 - this.k * v1 - v2;
  }
}

/** Band-limited sawtooth (PolyBLEP), so the pads don't alias. */
class Saw {
  private phase = random();
  private freq: number;

  constructor(freq: number) {
    this.freq = freq;
  }

  next(ratio = 1) {
    const dt = (this.freq * ratio) / SR;
    this.phase += dt;
    if (this.phase >= 1) this.phase -= 1;
    let t = this.phase;
    let blep = 0;
    if (t < dt) {
      t /= dt;
      blep = t + t - t * t - 1;
    } else if (t > 1 - dt) {
      t = (t - 1) / dt;
      blep = t * t + t + t + 1;
    }
    return 2 * this.phase - 1 - blep;
  }
}

const cents = (c: number) => 2 ** (c / 1200);
const TAU = Math.PI * 2;

// ── Instruments ─────────────────────────────────────────────────────────────

/**
 * Pumps the pads and bass against the kick — the breathing that makes a
 * sustained chord feel like it is moving.
 */
const sidechain = new Float32Array(N).fill(1);

function duckFrom(t0: number, depth: number) {
  const start = Math.round(t0 * SR);
  for (let i = 0; i < SR * 0.5 && start + i < N; i++) {
    const t = i / SR;
    const attack = Math.min(1, t / 0.006);
    const g = 1 - depth * attack * Math.exp(-t / 0.13);
    sidechain[start + i] = Math.min(sidechain[start + i], g);
  }
}

function pad(
  b: Bus,
  chord: number[],
  t0: number,
  hold: number,
  opts: {
    attack: number;
    release: number;
    cutoff: (t: number) => number;
    gain?: number;
  },
) {
  const length = hold + opts.release;
  const gain = opts.gain ?? 1;
  for (const note of chord) {
    // Two detuned saws a side: the spread between sides is the stereo width.
    for (const [pan, detune] of [
      [-0.7, -7],
      [0.7, 7],
    ]) {
      const a = new Saw(hz(note) * cents(detune));
      const c = new Saw(hz(note) * cents(-detune * 0.4));
      const f = new Filter();
      // The bass owns everything under ~160 Hz; pads there are only mud.
      const hp = new Filter(160, 0.6);
      render(b, t0, length, pan, (t, i) => {
        if ((i & 15) === 0) f.tune(opts.cutoff(t), 0.8);
        f.run((a.next() + c.next()) * 0.5);
        hp.run(f.low);
        const env =
          t < hold
            ? Math.min(1, t / opts.attack)
            : Math.exp(-(t - hold) / (opts.release / 4));
        return gain * hp.high * env * sidechain[i];
      });
    }
  }
}

function strings(b: Bus, chord: number[], t0: number, hold: number) {
  const release = 1.6;
  for (const note of chord) {
    // Four players a note, darkened: bright saws read as a synth, not strings.
    for (const [pan, detune] of [
      [-0.6, -11],
      [-0.2, -4],
      [0.2, 4],
      [0.6, 11],
    ]) {
      const saw = new Saw(hz(note) * cents(detune));
      const f = new Filter(1700, 0.55);
      const g = new Filter(1700, 0.55);
      const lfo = random() * TAU;
      render(b, t0, hold + release, pan, (t, i) => {
        const vibrato =
          1 + 0.0012 * Math.sin(TAU * (4.6 + detune / 20) * t + lfo);
        g.run(saw.next(vibrato));
        f.run(g.low);
        const swell = Math.sin((Math.min(1, t / 0.9) * Math.PI) / 2);
        const env =
          t < hold ? swell : swell * Math.exp(-(t - hold) / (release / 4));
        return f.low * env * Math.sqrt(sidechain[i]);
      });
    }
  }
}

/**
 * Sine partials at a marimba bar's 1 : 3.93 : 9.2 ratios. Soft mallets:
 * the upper partials are what collide with the voiceover's consonants.
 */
function marimba(
  b: Bus,
  note: number,
  t0: number,
  velocity: number,
  pan: number,
) {
  const f = hz(note);
  const body = 0.55 * (440 / f) ** 0.4;
  render(b, t0, 1.4, pan, (t) => {
    const onset = 1 - Math.exp(-t / 0.003);
    return (
      velocity *
      onset *
      (Math.sin(TAU * f * t) * Math.exp(-t / body) +
        0.1 * velocity * Math.sin(TAU * 3.93 * f * t) * Math.exp(-t / 0.045) +
        0.015 * velocity * Math.sin(TAU * 9.2 * f * t) * Math.exp(-t / 0.012))
    );
  });
}

/** Two-operator FM at a 4:1 ratio — a soft glass bell. */
function bell(
  b: Bus,
  note: number,
  t0: number,
  gain: number,
  pan: number,
  decay = 1.8,
) {
  const f = hz(note);
  render(b, t0, decay * 4, pan, (t) => {
    const index = 1.1 * Math.exp(-t / 0.3) + 0.15;
    const mod = index * Math.sin(TAU * 4 * f * t);
    const env = Math.min(1, t / 0.003) * Math.exp(-t / decay);
    return gain * env * Math.sin(TAU * f * t + mod);
  });
}

/** Sine with its second and third harmonics, so it survives phone speakers. */
function bass(b: Bus, note: number, t0: number, hold: number, gain: number) {
  const f = hz(note);
  let phase = 0;
  render(b, t0, hold + 0.08, 0, (t, i) => {
    phase += (TAU * f) / SR;
    const raw =
      Math.sin(phase) + 0.3 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase);
    const env =
      Math.min(1, t / 0.006) *
      Math.exp(-t / 0.9) *
      (t < hold ? 1 : Math.exp(-(t - hold) / 0.02));
    return gain * Math.tanh(1.3 * raw) * env * sidechain[i];
  });
}

function kick(b: Bus, t0: number, velocity: number) {
  let phase = 0;
  render(b, t0, 0.5, 0, (t) => {
    phase += (TAU * (46 + 74 * Math.exp(-t / 0.035))) / SR;
    const click = t < 0.004 ? noise() * Math.exp(-t / 0.001) * 0.25 : 0;
    return (
      velocity *
      Math.tanh(1.5 * (Math.sin(phase) * Math.exp(-t / 0.24) + click))
    );
  });
  duckFrom(t0, 0.38 * velocity);
}

/** A finger snap: three quick bursts of band-passed noise and a short tail. */
function snap(b: Bus, t0: number, velocity: number) {
  const f = new Filter(1700, 1.1);
  render(b, t0, 0.3, -0.12, (t) => {
    let env = 0.55 * Math.exp(-t / 0.055);
    for (const offset of [0, 0.008, 0.016]) {
      if (t >= offset) env = Math.max(env, Math.exp(-(t - offset) / 0.0035));
    }
    f.run(noise());
    // A millisecond of attack takes the click off without losing the snap.
    return velocity * f.band * env * Math.min(1, t / 0.0012);
  });
}

function shaker(b: Bus, t0: number, velocity: number) {
  const f = new Filter(6500, 0.9);
  render(b, t0, 0.12, 0.35, (t) => {
    f.run(noise());
    return velocity * f.high * Math.min(1, t / 0.005) * Math.exp(-t / 0.028);
  });
}

/** The intro's clock. */
function tick(b: Bus, t0: number, velocity: number, pan: number) {
  const f = new Filter(3600, 4);
  render(b, t0, 0.04, pan, (t) => {
    f.run(noise());
    return velocity * f.band * Math.exp(-t / 0.006);
  });
}

/** The intro's heartbeat: a low thump with enough harmonic to be heard. */
function thump(b: Bus, t0: number, velocity: number) {
  let phase = 0;
  render(b, t0, 0.5, 0, (t) => {
    phase += (TAU * (50 + 30 * Math.exp(-t / 0.03))) / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.17);
    return velocity * env * (Math.sin(phase) + 0.3 * Math.sin(2 * phase));
  });
}

/** A soft sub drop and a dark noise bloom. */
function impact(b: Bus, t0: number, gain: number) {
  let phase = 0;
  const f = new Filter();
  render(b, t0, 4, 0, (t, i) => {
    phase += (TAU * (44 + 46 * Math.exp(-t / 0.12))) / SR;
    const boom =
      (Math.sin(phase) + 0.25 * Math.sin(2 * phase)) *
      Math.min(1, t / 0.004) *
      Math.exp(-t / 1.0);
    if ((i & 15) === 0) f.tune(2400 * Math.exp(-t / 0.25) + 160, 0.7);
    f.run(noise());
    return gain * (boom + 0.35 * f.low * Math.exp(-t / 0.4));
  });
}

/**
 * Noise opening up towards `t1`, the way a reversed cymbal does. With
 * `chord`, the chord fades in under it like a reversed bell.
 */
function swell(
  b: Bus,
  t0: number,
  t1: number,
  gain: number,
  chord: number[] = [],
) {
  const span = t1 - t0;
  for (const [pan, seed] of [
    [-0.6, 0],
    [0.6, 1],
  ]) {
    const f = new Filter();
    render(b, t0, span, pan, (t, i) => {
      const x = t / span;
      if ((i & 15) === 0) f.tune(250 * 15 ** x, 0.8);
      f.run(noise());
      const cut = Math.min(1, (span - t) / 0.012);
      let tone = 0;
      chord.forEach((note, n) => {
        if (n % 2 === seed) tone += Math.sin(TAU * hz(note) * t);
      });
      return gain * cut * (x ** 2.6 * f.low + 0.22 * x ** 3 * tone);
    });
  }
}

/** Freeverb: eight damped combs into four allpasses, a side. */
function reverb(input: Bus, roomSize = 0.86, damping = 0.35): Bus {
  const out = bus();
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const allpasses = [556, 441, 341, 225];
  const feedback = roomSize * 0.28 + 0.7;
  const damp = damping * 0.4;
  const preDelay = Math.round(0.022 * SR);

  for (const [side, spread] of [
    ["l", 0],
    ["r", 23],
  ] as const) {
    const src = input[side];
    const dst = out[side];
    const combBufs = combs.map((n) => new Float32Array(n + spread));
    const combStore = combs.map(() => 0);
    const combIdx = combs.map(() => 0);
    const apBufs = allpasses.map((n) => new Float32Array(n + spread));
    const apIdx = allpasses.map(() => 0);
    let hp = 0;

    for (let i = 0; i < N; i++) {
      // A gentle high-pass on the way in keeps the tail from muddying the bass.
      const x = i >= preDelay ? src[i - preDelay] : 0;
      hp += 0.03 * (x - hp);
      const dry = (x - hp) * 0.015;

      let sum = 0;
      for (let c = 0; c < combBufs.length; c++) {
        const buf = combBufs[c];
        const y = buf[combIdx[c]];
        combStore[c] = y * (1 - damp) + combStore[c] * damp;
        buf[combIdx[c]] = dry + combStore[c] * feedback;
        combIdx[c] = (combIdx[c] + 1) % buf.length;
        sum += y;
      }
      for (let a = 0; a < apBufs.length; a++) {
        const buf = apBufs[a];
        const y = buf[apIdx[a]];
        buf[apIdx[a]] = sum + y * 0.5;
        apIdx[a] = (apIdx[a] + 1) % buf.length;
        sum = y - sum;
      }
      dst[i] = sum;
    }
  }
  return out;
}

// ── Arrangement ─────────────────────────────────────────────────────────────

const pads = bus();
const strs = bus();
const keys = bus();
const low = bus();
const drums = bus();
const fx = bus();

// Kicks first: everything sustained reads the sidechain they write.
for (let k = GROOVE_BAR; k < END_BAR; k++) {
  const last = k === END_BAR - 1;
  const steps =
    k >= LIFT_BAR
      ? last
        ? [0, 4, 8]
        : [0, 4, 8, 12]
      : [0, 6, 8, ...(k % 2 ? [14] : [])];
  for (const s of steps) kick(drums, at(k, s), s === 0 ? 0.9 : 0.75);
}

function padCutoff(k: number, t0: number): (t: number) => number {
  if (k < 0) {
    // The intro darkens the chords and opens them slowly towards the reveal.
    return (t) => 420 + 500 * Math.min(1, (t0 + t) / REVEAL);
  }
  if (k === 0) return (t) => 500 + 1500 * (1 - Math.exp(-t / 0.7));
  if (k >= END_BAR) return (t) => 700 + 1900 * Math.exp(-t / 1.4);
  if (k >= LIFT_BAR) return () => 2200;
  return () => 1650;
}

for (let k = FIRST_BAR; k <= END_BAR; k++) {
  const names = chordsIn(k);
  const share = BAR / names.length;

  names.forEach((name, n) => {
    const chord = CHORDS[name];
    // The intro's first chord starts from silence at 0, not on its downbeat.
    const t0 = k === FIRST_BAR && n === 0 ? 0 : bar(k) + n * share;
    const hold = k >= END_BAR ? 0.6 : bar(k) + (n + 1) * share - t0;
    const lastBreath = k === END_BAR - 1 && n === names.length - 1;

    pad(
      pads,
      k === END_BAR ? [midi("D3"), ...chord.pad] : chord.pad,
      t0,
      lastBreath ? hold - 2 * STEP : hold,
      {
        attack: k === FIRST_BAR ? 1.4 : k === 0 ? 0.02 : 0.12,
        release: k >= END_BAR ? 3.2 : k < 0 ? 0.9 : 0.5,
        cutoff: padCutoff(k, t0),
        // The intro sits back so the reveal has somewhere to arrive from.
        gain: k < 0 ? 0.55 : 1,
      },
    );

    if (k >= LIFT_BAR) {
      strings(
        strs,
        k >= END_BAR ? notes("A4 D5 F#5 A5") : chord.strings,
        t0,
        k >= END_BAR ? 1.2 : hold,
      );
    }

    // Bass: held through the intro and reveal, then a syncopated figure.
    if (k < GROOVE_BAR || k >= END_BAR) {
      const gain = k < 0 ? 0.55 : 0.9;
      bass(low, chord.bass, t0, k >= END_BAR ? 3.4 : hold, gain);
    }
  });

  if (k >= GROOVE_BAR && k < END_BAR) {
    const last = k === END_BAR - 1;
    for (const [s, len, interval] of [
      [0, 5, 0],
      [6, 2, 0],
      [8, 4, 0],
      [14, 2, 7],
    ]) {
      if (last && s >= 12) continue;
      bass(
        low,
        chordAt(k, s).bass + interval,
        at(k, s),
        len * STEP - 0.02,
        0.9,
      );
    }
  }
}

// Intro: a clock and a heartbeat under the hook's questions, then the swell.
for (let k = FIRST_BAR; k < 0; k++) {
  for (let s = 0; s < 16; s += 2) {
    const progress = (at(k, s) - bar(FIRST_BAR)) / (REVEAL - bar(FIRST_BAR));
    tick(drums, at(k, s), 0.25 + 0.3 * progress, s % 4 ? 0.3 : -0.2);
  }
  for (const s of k === -1 ? [0, 4, 8, 12] : [0, 8])
    thump(drums, at(k, s), 0.8);
}
swell(fx, bar(-1), REVEAL, 0.45, notes("D5 F#5 A5 C#6 E6"));

// Reveal: the hit, then a bell run opening upward.
impact(fx, REVEAL, 1);
notes("D5 F#5 A5 C#6 E6 A6").forEach((note, n) => {
  bell(keys, note, at(0, n), 0.32 - n * 0.03, n % 2 ? 0.45 : -0.45, 2.2);
});

// Marimba: a tresillo-flavoured figure over the chord tones.
const ARP_STEPS = [0, 3, 6, 8, 10, 12, 14];
const ARP_ORDER = [
  [0, 2, 4, 3, 1, 2, 3],
  [1, 3, 4, 2, 0, 1, 2],
];
for (let k = 1; k < END_BAR; k++) {
  const velocity = k < GROOVE_BAR ? 0.45 : k >= LIFT_BAR ? 0.8 : 0.65;
  ARP_STEPS.forEach((s, n) => {
    if (k === END_BAR - 1 && s >= 12) return;
    if (k < GROOVE_BAR && n % 2) return;
    const arp = chordAt(k, s).arp;
    const note = arp[ARP_ORDER[k % 2][n] % arp.length];
    const human = (random() - 0.5) * 0.008;
    const accent = (s % 4 === 0 ? 1 : 0.78) * (0.88 + random() * 0.24);
    marimba(
      keys,
      note,
      at(k, s) + human,
      velocity * accent,
      n % 2 ? 0.3 : -0.3,
    );
  });
}

// A bell on each four-bar phrase, so the loop doesn't feel like one.
for (const k of [4, LIFT_BAR]) {
  bell(keys, midi("A5"), bar(k), 0.16, 0.5);
  bell(keys, midi("F#6"), bar(k) + STEP, 0.1, -0.5);
}

// Groove: snaps on 2 and 4, a shaker on every sixteenth.
const SHAKE = [0.55, 0.22, 0.85, 0.3];
for (let k = 1; k < END_BAR; k++) {
  const last = k === END_BAR - 1;
  for (let s = 0; s < 16; s++) {
    if (last && s >= 12) break;
    const fadeIn = k < GROOVE_BAR ? s / 16 : 1;
    shaker(
      drums,
      at(k, s) + (random() - 0.5) * 0.006,
      SHAKE[s % 4] * 0.5 * fadeIn,
    );
  }
  if (k < GROOVE_BAR) continue;
  for (const s of [4, 12]) {
    if (last && s >= 12) continue;
    snap(drums, at(k, s), k >= LIFT_BAR ? 0.8 : 0.6);
  }
}

// Into the end card: a riser, then the last chord with a strummed bell.
swell(fx, bar(END_BAR - 1) + BAR / 2, RESOLVE, 0.3);
impact(fx, RESOLVE, 0.65);
notes("D5 A5 C#6 E6 F#6").forEach((note, n) => {
  bell(keys, note, RESOLVE + n * 0.035, 0.2, -0.6 + n * 0.3, 2.6);
});
marimba(keys, midi("D5"), RESOLVE, 0.7, -0.2);
marimba(keys, midi("A5"), RESOLVE + 0.02, 0.5, 0.2);

// ── Mix ─────────────────────────────────────────────────────────────────────

const MIX: [Bus, number, number][] = [
  // bus, level, reverb send
  [pads, 0.13, 0.3],
  [strs, 0.065, 0.5],
  [keys, 0.22, 0.42],
  [low, 0.27, 0],
  [drums, 0.42, 0.12],
  [fx, 0.4, 0.45],
];

const send = bus();
const master = bus();
for (const [b, level, wet] of MIX) {
  for (let i = 0; i < N; i++) {
    master.l[i] += b.l[i] * level;
    master.r[i] += b.r[i] * level;
    send.l[i] += b.l[i] * level * wet;
    send.r[i] += b.r[i] * level * wet;
  }
}
const tail = reverb(send);

const highPass = { l: new Filter(28, 0.7), r: new Filter(28, 0.7) };
for (const side of ["l", "r"] as const) {
  const m = master[side];
  const f = highPass[side];
  for (let i = 0; i < N; i++) {
    f.run(m[i] + tail[side][i] * 0.9);
    m[i] = f.high;
  }
}

// Gentle saturation as a limiter, then -1 dBFS peak and a fade at the end.
let peak = 0;
for (let i = 0; i < N; i++) {
  peak = Math.max(peak, Math.abs(master.l[i]), Math.abs(master.r[i]));
}
const ceiling = 10 ** (-1 / 20);
const fadeStart = (LENGTH_S - 0.6) * SR;
for (const side of ["l", "r"] as const) {
  const m = master[side];
  for (let i = 0; i < N; i++) {
    const fade =
      i > fadeStart ? Math.max(0, 1 - (i - fadeStart) / (0.6 * SR)) : 1;
    m[i] = (ceiling * Math.tanh((1.4 * m[i]) / peak) * fade) / Math.tanh(1.4);
  }
}

// ── Out ─────────────────────────────────────────────────────────────────────

/** 32-bit float WAV, the intermediate the encoder reads. */
function writeFloatWav(path: string, b: Bus) {
  const bytes = N * 2 * 4;
  const buf = Buffer.alloc(44 + bytes);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 8, 28);
  buf.writeUInt16LE(8, 32);
  buf.writeUInt16LE(32, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(bytes, 40);
  for (let i = 0; i < N; i++) {
    buf.writeFloatLE(b.l[i], 44 + i * 8);
    buf.writeFloatLE(b.r[i], 48 + i * 8);
  }
  writeFileSync(path, buf);
}

const wav = join(ROOT, "out", "music.wav");
const mp3 = join(ROOT, "public", "audio", "music.mp3");
mkdirSync(dirname(wav), { recursive: true });
mkdirSync(dirname(mp3), { recursive: true });
writeFloatWav(wav, master);

// `remotion ffmpeg`, run under this Node rather than through npx: spawning
// npx's .cmd shim on Windows needs a shell, and a shell concatenates args.
const encode = spawnSync(
  process.execPath,
  [
    join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js"),
    "ffmpeg",
    ...["-hide_banner", "-loglevel", "error", "-y", "-i", wav],
    ...["-codec:a", "libmp3lame", "-b:a", "192k", mp3],
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (encode.status !== 0) {
  console.error("ffmpeg failed to encode the MP3.");
  process.exitCode = 1;
} else {
  console.log(
    `${(60 / (BAR / 4)).toFixed(1)} BPM · reveal ${REVEAL}s · groove ${bar(GROOVE_BAR).toFixed(2)}s · ` +
      `lift ${bar(LIFT_BAR).toFixed(2)}s · resolve ${RESOLVE}s\nWrote ${relative(ROOT, mp3)}`,
  );
}
