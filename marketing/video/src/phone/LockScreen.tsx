import { useMemo } from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { DISPLAY, UI } from "../theme";
import { HomeIndicator, StatusBar } from "./parts";

const W = 454;
const H = 964;

function ridge(base: number, amp: number, seed: string) {
  const a = random(`${seed}1`) * Math.PI * 2;
  const b = random(`${seed}2`) * Math.PI * 2;
  const c = random(`${seed}3`) * Math.PI * 2;
  let d = `M0,${H} L0,${base}`;
  for (let x = 0; x <= W; x += 6) {
    const y =
      base -
      amp *
        (0.55 * Math.sin(x * 0.011 + a) +
          0.3 * Math.sin(x * 0.027 + b) +
          0.15 * Math.sin(x * 0.063 + c));
    d += ` L${x},${y.toFixed(1)}`;
  }
  return `${d} L${W},${H} Z`;
}

/** Dusk over a sea of clouds — Mt. Pulag, where the reminder is for. */
const Wallpaper: React.FC = () => {
  const ridges = useMemo(
    () => ({
      far: ridge(690, 48, "far"),
      mid: ridge(790, 56, "mid"),
      near: ridge(880, 70, "near"),
    }),
    [],
  );

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: "absolute" }}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E1830" />
          <stop offset="0.36" stopColor="#2A3766" />
          <stop offset="0.58" stopColor="#8B6A8F" />
          <stop offset="0.69" stopColor="#E59A74" />
          <stop offset="0.76" stopColor="#F5C48C" />
        </linearGradient>
        <radialGradient id="sun">
          <stop offset="0" stopColor="#FFE2B0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFE2B0" stopOpacity="0" />
        </radialGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      <circle cx="318" cy="676" r="120" fill="url(#sun)" />
      <circle cx="318" cy="676" r="28" fill="#FFE6BC" />
      <path d={ridges.far} fill="#5E5A88" />
      <g filter="url(#soft)" fill="#F7E7E1" opacity="0.92">
        <ellipse cx="60" cy="742" rx="140" ry="26" />
        <ellipse cx="230" cy="752" rx="160" ry="24" />
        <ellipse cx="400" cy="738" rx="130" ry="28" />
        <ellipse cx="150" cy="770" rx="170" ry="20" />
        <ellipse cx="350" cy="772" rx="150" ry="22" />
      </g>
      <path d={ridges.mid} fill="#2C3359" />
      <path d={ridges.near} fill="#131A31" />
    </svg>
  );
};

/** convex/push.ts titles the push `Trip tomorrow: <destination>`. */
export const LockScreen: React.FC<{ notification: number }> = ({
  notification,
}) => (
  <AbsoluteFill style={{ fontFamily: UI }}>
    <Wallpaper />
    <StatusBar light />
    <div
      style={{
        position: "absolute",
        top: 88,
        width: "100%",
        textAlign: "center",
        color: "rgba(255,255,255,0.94)",
      }}
    >
      <div style={{ fontSize: 21, fontWeight: 600 }}>Friday, October 23</div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 118,
          fontWeight: 700,
          lineHeight: 1,
          marginTop: 2,
          letterSpacing: "-0.02em",
        }}
      >
        6:00
      </div>
    </div>

    {notification > 0 && (
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 312,
          display: "flex",
          gap: 12,
          padding: "14px 16px 15px 14px",
          borderRadius: 26,
          background: "rgba(248,246,244,0.84)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          opacity: Math.min(1, notification * 1.4),
          transform: `translateY(${(1 - notification) * -70}px) scale(${0.94 + 0.06 * notification})`,
        }}
      >
        <Img
          src={staticFile("icon-tile.png")}
          style={{ width: 42, height: 42, borderRadius: 10 }}
        />
        <div style={{ flex: 1, color: "#1A1A1A" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>AITrav</span>
            <span style={{ fontSize: 14, color: "#6E6E6E" }}>now</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
            Trip tomorrow: Mt. Pulag
          </div>
          <div
            style={{
              fontSize: 15.5,
              lineHeight: 1.36,
              marginTop: 2,
              color: "#2A2A2A",
            }}
          >
            Rain has moved in since we spoke — expect a cold, wet summit. Pack a
            rain shell and an extra warm layer.
          </div>
        </div>
      </div>
    )}
    <HomeIndicator light />
  </AbsoluteFill>
);
