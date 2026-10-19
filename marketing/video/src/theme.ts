import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_S = 30;

/*
 * The 9:16 cut renders the same scenes; each one branches its layout on
 * useVertical(). It keeps its content clear of what TikTok, Reels and Shorts
 * draw on top: the tab bar (top ~160px), the like/comment rail (right
 * ~120px, middle of the screen) and the caption block (bottom ~380px).
 */
export const VERTICAL_WIDTH = 1080;
export const VERTICAL_HEIGHT = 1920;

export function useVertical(): boolean {
  const { width, height } = useVideoConfig();
  return height > width;
}

export const DISPLAY = loadJakarta("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;

// The phone screens stand in for the app's system font.
export const UI = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

/**
 * Stage colours are the app's dark-mode tokens from global.css; the phone
 * screens use its light-mode tokens, so the UI on screen is the real palette.
 */
export const C = {
  // stage
  bgDeep: "#08140F",
  bg: "#0E231B",
  bgLift: "#143528",
  ink: "#F0F1EF",
  inkSoft: "#B9C4BF",
  inkMuted: "#8E9A95",
  mint: "#74C5A0",
  sage: "#7AB096",
  amber: "#E2B35C",
  coral: "#F08A78",
  sky: "#8CB8E8",
  // app, light theme
  paper: "#FDFDFC",
  card: "#FFFFFF",
  muted: "#F4F5F4",
  accent: "#F0F2F0",
  border: "#E5E7E5",
  fg: "#181A1B",
  fgMuted: "#6C7170",
  pine: "#24503F",
  pineInk: "#FBFAF5",
};

export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};

type SpringConfig = NonNullable<Parameters<typeof spring>[0]["config"]>;

/** Seconds since the start of the enclosing <Sequence>. */
export function useSeconds(): number {
  return useCurrentFrame() / FPS;
}

/** Eased 0→1 progress of `t` through [start, start + dur], in seconds. */
export function p(
  t: number,
  start: number,
  dur: number,
  easing: (x: number) => number = ease.out,
): number {
  if (t <= start) return 0;
  if (t >= start + dur) return 1;
  return easing((t - start) / dur);
}

export function springAt(
  t: number,
  start: number,
  config: Partial<SpringConfig> = { damping: 200 },
): number {
  if (t < start) return 0;
  return spring({ frame: (t - start) * FPS, fps: FPS, config });
}

/** Fade-and-rise in at `inAt`, optionally fade-and-lift out at `outAt`. */
export function rise(
  t: number,
  inAt: number,
  outAt = Infinity,
  { dy = 28, dur = 0.6 }: { dy?: number; dur?: number } = {},
): React.CSSProperties {
  const i = p(t, inAt, dur);
  const o = p(t, outAt, 0.4, ease.in);
  return {
    opacity: i * (1 - o),
    transform: `translateY(${(1 - i) * dy - o * 20}px)`,
  };
}

/** A tap: the dot appears, presses, and lifts. */
export function touch(t: number, appearAt: number, pressAt: number) {
  const show = p(t, appearAt, 0.2) * (1 - p(t, pressAt + 0.3, 0.2));
  const press = p(t, pressAt, 0.08) * (1 - p(t, pressAt + 0.16, 0.12));
  return { show, press };
}

export type Touch = ReturnType<typeof touch>;

/** Streams `text` word by word, the way the reply arrives in the app. */
export function streamWords(text: string, progress: number): string {
  const words = text.split(" ");
  return words.slice(0, Math.round(progress * words.length)).join(" ");
}

/** Types `text` character by character. */
export function typeChars(text: string, progress: number): string {
  return text.slice(0, Math.round(progress * text.length));
}
