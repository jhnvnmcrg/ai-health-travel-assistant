import { AbsoluteFill } from "remotion";
import { C, DISPLAY, ease, p, rise, useSeconds, useVertical } from "../theme";

type Line = { parts: [string, string][]; at: number };

const LINES: Line[] = [
  {
    parts: [
      ["7,641", C.amber],
      [" islands.", C.ink],
    ],
    at: 0.25,
  },
  {
    parts: [
      ["Heat index past ", C.ink],
      ["40°C.", C.coral],
    ],
    at: 1.05,
  },
  {
    parts: [
      ["Trails that go dark ", C.ink],
      ["by six.", C.amber],
    ],
    at: 1.85,
  },
  { parts: [["Is it safe to go?", C.mint]], at: 2.75 },
];

// The same lines, broken for a 1080px-wide frame so the type can stay big.
const VERTICAL_LINES: Line[] = [
  {
    parts: [
      ["7,641", C.amber],
      [" islands.", C.ink],
    ],
    at: 0.25,
  },
  {
    parts: [
      ["Heat index\npast ", C.ink],
      ["40°C.", C.coral],
    ],
    at: 1.05,
  },
  {
    parts: [
      ["Trails that go\ndark ", C.ink],
      ["by six.", C.amber],
    ],
    at: 1.85,
  },
  { parts: [["Is it safe\nto go?", C.mint]], at: 2.75 },
];

const OUT = 3.95;

export const Hook: React.FC = () => {
  const t = useSeconds();
  const vertical = useVertical();
  const lines = vertical ? VERTICAL_LINES : LINES;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        paddingLeft: vertical ? 90 : 150,
        paddingBottom: vertical ? 220 : 0,
        fontFamily: DISPLAY,
      }}
    >
      <div
        style={{
          ...rise(t, 0.05, OUT, { dy: 12 }),
          color: C.amber,
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "0.28em",
          marginBottom: 30,
        }}
      >
        TRAVELLING THE PHILIPPINES
      </div>

      {lines.map((line, i) => {
        const inP = p(t, line.at, 0.75);
        const outP = p(t, OUT + i * 0.06, 0.45, ease.in);

        return (
          <div
            key={i}
            style={{
              overflow: "hidden",
              paddingBottom: 6,
              marginBottom: vertical ? 22 : 0,
            }}
          >
            <div
              style={{
                fontSize: vertical ? 120 : 112,
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: vertical ? 1.04 : 1.1,
                whiteSpace: "pre-line",
                transform: `translateY(${(1 - inP) * 105 - outP * 105}%)`,
                opacity: Math.min(1, inP * 2) * (1 - outP),
              }}
            >
              {line.parts.map(([text, color], j) => (
                <span key={j} style={{ color }}>
                  {text}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
