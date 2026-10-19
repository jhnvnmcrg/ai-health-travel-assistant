import { Icon } from "./Icon";
import type { IconName } from "./icons";
import { C, DISPLAY, ease, p, springAt } from "./theme";

export type Chip = {
  icon: IconName;
  label: string;
  value: string;
  tone: string;
  /** Top edge in the 16:9 frame; the chip sits right of the phone. */
  top: number;
  /** Position in the 9:16 frame, where there is no room beside the phone. */
  vertical: { left: number; top: number };
  inAt: number;
  outAt: number;
};

type SideChipProps = {
  chip: Chip;
  t: number;
  left: number;
  top: number;
  width?: number;
  /** Rise from below (9:16) rather than slide out from the phone (16:9). */
  rise?: boolean;
};

/** A floating fact card beside the phone, sprung out from the phone's edge. */
export const SideChip: React.FC<SideChipProps> = ({
  chip,
  t,
  left,
  top,
  width,
  rise,
}) => {
  const s = springAt(t, chip.inAt, { damping: 15, stiffness: 150, mass: 0.8 });
  const out = p(t, chip.outAt, 0.35, ease.in);

  if (s <= 0 || out >= 1) return null;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 24px 16px 16px",
        borderRadius: 22,
        background: "#0C1B15",
        border: "1.5px solid rgba(122,176,150,0.24)",
        boxShadow: "0 24px 50px rgba(0,0,0,0.38)",
        fontFamily: DISPLAY,
        whiteSpace: "nowrap",
        opacity: Math.min(1, s * 1.6) * (1 - out),
        transform: rise
          ? `translateY(${(1 - s) * 44 - out * 16}px) scale(${0.9 + 0.1 * s})`
          : `translateX(${(1 - s) * -48 + out * 24}px) scale(${0.88 + 0.12 * s})`,
        transformOrigin: rise ? "center bottom" : "left center",
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 15,
          background: `${chip.tone}24`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={chip.icon} size={26} color={chip.tone} />
      </div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: C.inkMuted,
          }}
        >
          {chip.label}
        </div>
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            color: C.ink,
            marginTop: 2,
          }}
        >
          {chip.value}
        </div>
      </div>
    </div>
  );
};
