import { useMemo } from "react";
import { AbsoluteFill, random, useVideoConfig } from "remotion";
import { C, useSeconds } from "./theme";

/**
 * One topographic ring. Rings in a cluster share their phases, so they nest
 * like contour lines on a survey map instead of crossing.
 */
function ring(cx: number, cy: number, r: number, seed: string, k: number) {
  const a = random(`${seed}a`) * Math.PI * 2;
  const b = random(`${seed}b`) * Math.PI * 2;
  const c = random(`${seed}c`) * Math.PI * 2;
  const points: string[] = [];

  for (let i = 0; i <= 140; i++) {
    const th = (i / 140) * Math.PI * 2;
    const wobble =
      1 +
      0.11 * Math.sin(2 * th + a + k * 0.12) +
      0.06 * Math.sin(3 * th + b - k * 0.09) +
      0.03 * Math.sin(5 * th + c + k * 0.2);
    const x = cx + r * wobble * Math.cos(th);
    const y = cy + r * wobble * Math.sin(th) * 0.78;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return `M${points.join("L")}Z`;
}

function cluster(cx: number, cy: number, count: number, seed: string) {
  return Array.from({ length: count }, (_, k) => ({
    d: ring(cx, cy, 70 + k * 46, seed, k),
    index: k % 5 === 4,
  }));
}

export const Background: React.FC = () => {
  const t = useSeconds();
  const { width, height } = useVideoConfig();

  // Two contour clusters in opposite corners, placed by proportion so the
  // 9:16 cut gets the same composition as the 16:9 one.
  const centres = useMemo(
    () => ({
      a: [width * 0.885, height * 0.157],
      b: [width * 0.094, height * 0.889],
    }),
    [width, height],
  );
  const rings = useMemo(
    () => ({
      a: cluster(centres.a[0], centres.a[1], 16, "north"),
      b: cluster(centres.b[0], centres.b[1], 14, "south"),
    }),
    [centres],
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, ${C.bgDeep} 0%, ${C.bg} 55%, ${C.bgLift} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(1000px 760px at ${74 - t * 0.35}% ${24 + t * 0.25}%, rgba(226,179,92,0.17), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(900px 640px at 10% 96%, rgba(116,197,160,0.13), transparent 70%)",
        }}
      />
      <svg width={width} height={height} style={{ position: "absolute" }}>
        {(["a", "b"] as const).map((key, ci) => (
          <g
            key={key}
            transform={`rotate(${(ci ? -1 : 1) * t * 0.7} ${centres[key].join(" ")})`}
          >
            {rings[key].map(({ d, index }, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={C.sage}
                strokeOpacity={index ? 0.2 : 0.1}
                strokeWidth={index ? 2 : 1.3}
              />
            ))}
          </g>
        ))}
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
