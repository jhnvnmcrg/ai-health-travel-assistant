import { Icon } from "../Icon";
import { C, UI, type Touch } from "../theme";

export const PHONE = { x: 1030, y: 45, w: 480, h: 990, bezel: 13, radius: 78 };

export const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div style={{ position: "relative", width: PHONE.w, height: PHONE.h }}>
    {/* side buttons */}
    {[
      { side: "left", top: 190, h: 40 },
      { side: "left", top: 258, h: 76 },
      { side: "left", top: 350, h: 76 },
      { side: "right", top: 290, h: 118 },
    ].map(({ side, top, h }) => (
      <div
        key={`${side}${top}`}
        style={{
          position: "absolute",
          top,
          [side]: -4,
          width: 6,
          height: h,
          borderRadius: 3,
          background: "#1C2120",
        }}
      />
    ))}
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: PHONE.radius,
        padding: PHONE.bezel,
        background:
          "linear-gradient(145deg, #3A403E 0%, #0B0D0D 18%, #0B0D0D 82%, #2E3432 100%)",
        boxShadow:
          "0 80px 140px rgba(0,0,0,0.55), 0 30px 60px rgba(0,0,0,0.35), inset 0 0 0 2px #444B49",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: PHONE.radius - PHONE.bezel,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {children}
        <div
          style={{
            position: "absolute",
            top: 13,
            left: "50%",
            width: 124,
            height: 36,
            marginLeft: -62,
            borderRadius: 20,
            background: "#000",
          }}
        />
      </div>
    </div>
  </div>
);

export const StatusBar: React.FC<{ clock?: string; light?: boolean }> = ({
  clock,
  light,
}) => {
  const color = light ? "#FFFFFF" : C.fg;
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "4px 34px 0 46px",
        fontFamily: UI,
        fontWeight: 600,
        fontSize: 18,
        color,
        zIndex: 5,
      }}
    >
      <span>{clock}</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Icon name="signal" size={18} color={color} strokeWidth={2.6} />
        <Icon name="wifi" size={18} color={color} strokeWidth={2.6} />
        <Icon name="battery-full" size={26} color={color} strokeWidth={2} />
      </div>
    </div>
  );
};

export const HomeIndicator: React.FC<{ light?: boolean }> = ({ light }) => (
  <div
    style={{
      position: "absolute",
      bottom: 9,
      left: "50%",
      width: 150,
      height: 5,
      marginLeft: -75,
      borderRadius: 3,
      background: light ? "rgba(255,255,255,0.9)" : C.fg,
    }}
  />
);

/** A screen-recording style touch marker, centred on its parent by default. */
export const TouchDot: React.FC<{
  touch?: Touch;
  style?: React.CSSProperties;
}> = ({ touch, style }) => {
  if (!touch || touch.show <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 58,
        height: 58,
        marginLeft: -29,
        marginTop: -29,
        borderRadius: 29,
        background: `rgba(36,80,63,${0.18 + touch.press * 0.18})`,
        border: "2.5px solid rgba(255,255,255,0.9)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        transform: `scale(${(0.6 + 0.4 * touch.show) * (1 - 0.16 * touch.press)})`,
        opacity: touch.show,
        zIndex: 20,
        ...style,
      }}
    />
  );
};

/** Reveals a list item by growing its height, the way a new row pushes in. */
export const Grow: React.FC<{
  p: number;
  max: number;
  children: React.ReactNode;
}> = ({ p, max, children }) => {
  if (p <= 0) return null;
  const done = p >= 1;
  return (
    <div
      style={{
        maxHeight: done ? undefined : p * max,
        overflow: done ? "visible" : "hidden",
        opacity: Math.min(1, p * 1.5),
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};
