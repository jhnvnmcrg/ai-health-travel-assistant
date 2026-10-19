import { AbsoluteFill } from "remotion";
import { C, DISPLAY, ease, p, rise, useSeconds, useVertical } from "../theme";

type CaptionProps = {
  eyebrow: string;
  /** Explicit line breaks with "\n", so every headline wraps on purpose. */
  title: string;
  body: string;
  outAt: number;
};

/**
 * The headline panel: left of the phone in 16:9, centred above it in 9:16.
 */
export const Caption: React.FC<CaptionProps> = ({
  eyebrow,
  title,
  body,
  outAt,
}) => {
  const t = useSeconds();
  const vertical = useVertical();
  const out = p(t, outAt, 0.4, ease.in);

  return (
    <AbsoluteFill
      style={
        vertical
          ? { alignItems: "center", paddingTop: 196, fontFamily: DISPLAY }
          : { justifyContent: "center", paddingLeft: 140, fontFamily: DISPLAY }
      }
    >
      <div
        style={{
          width: vertical ? 940 : 820,
          display: "flex",
          flexDirection: "column",
          alignItems: vertical ? "center" : "flex-start",
          textAlign: vertical ? "center" : "left",
          opacity: 1 - out,
          transform: `translateY(${-out * 24}px)`,
        }}
      >
        <div
          style={{
            ...rise(t, 0.05, Infinity, { dy: 10 }),
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: C.amber,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.24em",
            marginBottom: vertical ? 22 : 26,
          }}
        >
          <div
            style={{
              width: 40,
              height: 3,
              borderRadius: 2,
              background: C.amber,
            }}
          />
          {eyebrow}
          {vertical && (
            <div
              style={{
                width: 40,
                height: 3,
                borderRadius: 2,
                background: C.amber,
              }}
            />
          )}
        </div>

        {title.split("\n").map((line, i) => {
          const lp = p(t, 0.15 + i * 0.1, 0.7);
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: 6 }}>
              <div
                style={{
                  fontSize: vertical ? 84 : 80,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.06,
                  color: C.ink,
                  transform: `translateY(${(1 - lp) * 105}%)`,
                }}
              >
                {line}
              </div>
            </div>
          );
        })}

        <div
          style={{
            ...rise(t, 0.5, Infinity, { dy: 18 }),
            marginTop: vertical ? 22 : 28,
            width: vertical ? 860 : 700,
            fontSize: vertical ? 32 : 30,
            fontWeight: 500,
            lineHeight: 1.42,
            color: C.inkSoft,
            textWrap: vertical ? "balance" : "pretty",
          }}
        >
          {body}
        </div>
      </div>
    </AbsoluteFill>
  );
};
