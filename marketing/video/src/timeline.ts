/**
 * Scene timing, in seconds. Each scene's own clock starts at its `from`.
 *
 * The soundtrack is cut to these too: the voiceover lines start relative to
 * them, and scripts/music.ts puts the music's reveal hit, lift and final
 * chord on the logo, reminder and end-card cuts. After moving a scene, run
 * `npm run music` so the score follows.
 *
 * Kept free of imports so those scripts can load it under plain Node.
 */
export const SCENES = {
  hook: { from: 0, dur: 4.7 },
  logo: { from: 4.5, dur: 3.2 },
  phone: { from: 7.2, dur: 19.4 },
  ask: { from: 7.8, dur: 6.8 },
  lost: { from: 14.6, dur: 7.0 },
  remind: { from: 21.6, dur: 4.5 },
  end: { from: 26.0, dur: 4.0 },
};
