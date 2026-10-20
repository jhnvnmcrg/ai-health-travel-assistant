import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "./Background";
import { PhoneStage } from "./phone/PhoneStage";
import { Caption } from "./scenes/Caption";
import { EndCard } from "./scenes/EndCard";
import { Hook } from "./scenes/Hook";
import { Logo } from "./scenes/Logo";
import { Soundtrack } from "./Soundtrack";
import { C, DURATION_S, FPS, UI, p, useSeconds } from "./theme";
import { SCENES as S } from "./timeline.ts";

const Scene: React.FC<{
  name: string;
  at: { from: number; dur: number };
  children: React.ReactNode;
}> = ({ name, at, children }) => (
  <Sequence
    name={name}
    from={Math.round(at.from * FPS)}
    durationInFrames={Math.round(at.dur * FPS)}
  >
    {children}
  </Sequence>
);

const FadeToBlack: React.FC = () => {
  const t = useSeconds();
  return (
    <AbsoluteFill
      style={{ background: "#000", opacity: p(t, DURATION_S - 0.5, 0.5) }}
    />
  );
};

export const AITravPH: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: UI, background: C.bgDeep }}>
    <Background />

    <Scene name="Hook" at={S.hook}>
      <Hook />
    </Scene>

    <Scene name="Logo" at={S.logo}>
      <Logo />
    </Scene>

    <Scene name="Caption · ask" at={S.ask}>
      <Caption
        eyebrow="LIVE CONDITIONS × YOUR HEALTH"
        title={"Ask about anywhere\nyou’re headed."}
        body="It checks live weather, heat index and air quality, then weighs them against your own health profile."
        outAt={S.ask.dur - 0.45}
      />
    </Scene>

    <Scene name="Caption · lost" at={S.lost}>
      <Caption
        eyebrow="LOST OR DISORIENTED"
        title={"Lost? Find the\nnearest safe place."}
        body="Towns, police and hospitals nearby, with distance and direction. One tap opens Google Maps."
        outAt={S.lost.dur - 0.5}
      />
    </Scene>

    <Scene name="Caption · remind" at={S.remind}>
      <Caption
        eyebrow="TRIP REMINDERS"
        title={"Fresh advice the\nnight before."}
        body="Save a trip and get a 6pm reminder built on tomorrow’s real forecast — not last week’s."
        outAt={S.remind.dur - 0.5}
      />
    </Scene>

    <Scene name="Phone" at={S.phone}>
      <PhoneStage />
    </Scene>

    <Scene name="End card" at={S.end}>
      <EndCard />
    </Scene>

    <FadeToBlack />

    <Soundtrack />
  </AbsoluteFill>
);
