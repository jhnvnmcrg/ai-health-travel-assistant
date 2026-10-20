import { AbsoluteFill, Img, staticFile } from "remotion";
import { Icon } from "../Icon";
import type { IconName } from "../icons";
import {
  C,
  DISPLAY,
  p,
  rise,
  springAt,
  useSeconds,
  useVertical,
} from "../theme";
import { WORDMARK } from "./Logo";

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: "thermometer", label: "Live conditions" },
  { icon: "heart-pulse", label: "Health-aware advice" },
  { icon: "navigation", label: "Safe places nearby" },
  { icon: "bell", label: "Trip reminders" },
];

export const EndCard: React.FC = () => {
  const t = useSeconds();
  const vertical = useVertical();
  const icon = springAt(t, 0.3, { damping: 14, stiffness: 120 });

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: vertical ? 200 : 0,
        textAlign: "center",
        fontFamily: DISPLAY,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: vertical ? "column" : "row",
          alignItems: "center",
          gap: vertical ? 30 : 34,
        }}
      >
        <Img
          src={staticFile("icon-tile.png")}
          style={{
            width: vertical ? 190 : 140,
            height: vertical ? 190 : 140,
            transform: `scale(${0.6 + icon * 0.4})`,
            opacity: Math.min(1, icon * 1.5),
            filter: "drop-shadow(0 24px 48px rgba(20,110,200,0.32))",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: vertical ? 132 : 120,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {WORDMARK.split("").map((ch, i) => {
            const lp = p(t, 0.45 + i * 0.035, 0.6);
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 12 }}>
                <div
                  style={{
                    transform: `translateY(${(1 - lp) * 110}%)`,
                    color: C.ink,
                  }}
                >
                  {ch}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          ...rise(t, 0.85, Infinity, { dy: 20 }),
          marginTop: vertical ? 24 : 30,
          fontSize: vertical ? 78 : 66,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: C.mint,
        }}
      >
        Know before you go.
      </div>

      <div
        style={{
          ...rise(t, 1.1, Infinity, { dy: 16 }),
          marginTop: 10,
          maxWidth: vertical ? 760 : undefined,
          fontSize: vertical ? 36 : 30,
          fontWeight: 500,
          lineHeight: 1.35,
          textWrap: "balance",
          color: C.inkSoft,
        }}
      >
        Your AI travel-health advisor for the Philippines.
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          maxWidth: vertical ? 760 : undefined,
          marginTop: 52,
        }}
      >
        {FEATURES.map((feature, i) => (
          <div
            key={feature.label}
            style={{
              ...rise(t, 1.4 + i * 0.08, Infinity, { dy: 14 }),
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "13px 24px 13px 18px",
              borderRadius: 999,
              border: "1.5px solid rgba(122,176,150,0.32)",
              background: "rgba(122,176,150,0.08)",
              fontSize: 24,
              fontWeight: 600,
              color: C.ink,
            }}
          >
            <Icon name={feature.icon} size={24} color={C.mint} />
            {feature.label}
          </div>
        ))}
      </div>

      <div
        style={{
          ...rise(t, 1.9, Infinity, { dy: 8 }),
          // In 9:16 the bottom of the frame sits under the app's caption
          // overlay, so the fine print follows the pills instead.
          ...(vertical
            ? { marginTop: 56, maxWidth: 700, textWrap: "balance" as const }
            : { position: "absolute" as const, bottom: 56 }),
          fontSize: vertical ? 24 : 20,
          fontWeight: 500,
          color: C.inkMuted,
        }}
      >
        AI guidance, not medical advice. In an emergency, call 911. Screens
        simulated.
      </div>
    </AbsoluteFill>
  );
};
