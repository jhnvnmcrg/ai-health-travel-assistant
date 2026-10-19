import { AbsoluteFill, Img, staticFile } from "remotion";
import {
  C,
  DISPLAY,
  ease,
  p,
  rise,
  springAt,
  useSeconds,
  useVertical,
} from "../theme";

const WORDMARK = "AITravPH".split("");

/** "AITrav" in ink, "PH" in amber — the same split the end card uses. */
export function wordmarkColor(index: number) {
  return index >= 6 ? C.amber : C.ink;
}

export const Logo: React.FC = () => {
  const t = useSeconds();
  const vertical = useVertical();
  const icon = springAt(t, 0.15, { damping: 13, stiffness: 110, mass: 0.9 });
  const halo = p(t, 0.3, 1.3);
  const out = p(t, 2.6, 0.5, ease.in);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: vertical ? 160 : 0,
        fontFamily: DISPLAY,
        opacity: 1 - out,
        transform: `translateY(${-out * 40}px)`,
        filter: `blur(${out * 6}px)`,
      }}
    >
      <div style={{ position: "relative", width: 220, height: 220 }}>
        {halo > 0 && halo < 1 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 48,
              border: `2px solid ${C.mint}`,
              transform: `scale(${1 + halo * 0.75})`,
              opacity: (1 - halo) * 0.6,
            }}
          />
        )}
        <Img
          src={staticFile("icon-tile.png")}
          style={{
            width: 220,
            height: 220,
            transform: `scale(${0.5 + icon * 0.5})`,
            opacity: Math.min(1, icon * 1.5),
            filter: "drop-shadow(0 30px 60px rgba(20,110,200,0.35))",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          marginTop: 40,
          fontSize: 128,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {WORDMARK.map((ch, i) => {
          const lp = p(t, 0.5 + i * 0.04, 0.6);
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: 12 }}>
              <div
                style={{
                  transform: `translateY(${(1 - lp) * 110}%)`,
                  color: wordmarkColor(i),
                }}
              >
                {ch}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          ...rise(t, 1.1, Infinity, { dy: 16 }),
          marginTop: 14,
          maxWidth: vertical ? 760 : undefined,
          fontSize: vertical ? 40 : 36,
          fontWeight: 500,
          lineHeight: 1.35,
          textAlign: "center",
          textWrap: "balance",
          color: C.inkSoft,
        }}
      >
        Your AI travel-health advisor for the Philippines.
      </div>
    </AbsoluteFill>
  );
};
