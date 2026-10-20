import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import { VO_DURATIONS } from "./vo-durations";
import { VO_LINES } from "./voiceover";

/*
 * Music from scripts/music.ts, voice from scripts/voiceover.ts. The music
 * ducks under each line rather than being mixed low throughout, so it can
 * carry the hook, the gaps and the end card at full presence.
 *
 * The clips are normalised to the same peak; these levels put the music
 * about 11 dB under the voice while a line plays and 3 dB under it between
 * lines.
 */
const MUSIC = 0.42;
const MUSIC_UNDER_VOICE = 0.16;
/** The duck leads each line a little and lets go slowly, as a mixer would. */
const DUCK_ATTACK_S = 0.25;
const DUCK_RELEASE_S = 0.6;

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** 0 with no line playing, 1 under one, eased in between. */
function duckAt(t: number): number {
  let duck = 0;
  for (const line of VO_LINES) {
    const end = line.at + VO_DURATIONS[line.id];
    const into = (t - line.at + DUCK_ATTACK_S) / DUCK_ATTACK_S;
    const out = (end + DUCK_RELEASE_S - t) / DUCK_RELEASE_S;
    duck = Math.max(duck, smooth(Math.min(into, out)));
  }
  return duck;
}

export const Soundtrack: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <>
      <Audio
        src={staticFile("audio/music.mp3")}
        volume={(frame) =>
          MUSIC + (MUSIC_UNDER_VOICE - MUSIC) * duckAt(frame / fps)
        }
      />

      {VO_LINES.map((line) => (
        <Sequence
          key={line.id}
          name={`VO · ${line.id}`}
          layout="none"
          from={Math.round(line.at * fps)}
          durationInFrames={Math.ceil(VO_DURATIONS[line.id] * fps)}
        >
          <Audio src={staticFile(`audio/vo/${line.id}.wav`)} />
        </Sequence>
      ))}
    </>
  );
};
