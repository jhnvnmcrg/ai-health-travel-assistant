import { Easing } from "remotion";
import { SideChip, type Chip } from "../SideChip";
import {
  C,
  ease,
  p,
  springAt,
  streamWords,
  touch,
  typeChars,
  useSeconds,
  useVertical,
  VERTICAL_WIDTH,
} from "../theme";
import {
  ChatScreen,
  SUGGESTIONS,
  type Item,
  type SafePlace,
} from "./ChatScreen";
import { LockScreen } from "./LockScreen";
import { PHONE, PhoneFrame } from "./parts";

/*
 * Every time below is in seconds from the phone's own <Sequence> start
 * (7.2s into the video). Three beats: ask (A), lost (B), reminder (lock).
 */

const linear = Easing.linear;

const A_QUESTION = SUGGESTIONS[1];
const A_REPLY =
  "Baguio’s air is fairly clean today — PM2.5 is around 18 µg/m³ and it’s a cool 22°C. Showers are likely after 2pm, and cold, damp air can tighten your airways. Go out in the morning, keep your reliever inhaler on you, and pack a warm layer.";

const B_QUESTION = "I’m lost on a trail near Sagada and it’s getting dark.";
const B_REPLY =
  "If you’re hurt or in danger, call 911 now. Otherwise, staying put can be safer than walking in the dark — it gets dark fast here. If you do move, these are the nearest safe places:";

const B_PLACES: SafePlace[] = [
  {
    icon: "navigation",
    name: "Poblacion, Sagada",
    meta: "Town · 1.8 km northeast",
  },
  {
    icon: "shield",
    name: "Sagada Municipal Police Station",
    meta: "Police · 2.1 km northeast",
  },
  {
    icon: "hospital",
    name: "St. Theodore’s Hospital",
    meta: "Hospital · 2.4 km east",
  },
];

const CHIP_X = PHONE.x + PHONE.w + 34;

/*
 * 9:16 layout. The phone sits centred under the caption, and the chips float
 * over whatever part of its screen is empty at that moment — below the reply
 * in A, below the safe-places card in B, under the notification on the lock
 * screen — in two columns that stop short of TikTok's button rail.
 */
const V_PHONE = { x: (VERTICAL_WIDTH - PHONE.w) / 2, y: 610 };
const V_CHIP_W = 390;
const V_COL = {
  left: 130,
  right: 560,
  centre: (VERTICAL_WIDTH - V_CHIP_W) / 2,
};

const CHIPS: Chip[] = [
  // A — what the reply was built from
  {
    icon: "heart-pulse",
    label: "Your health profile",
    value: "Asthma",
    tone: C.coral,
    top: 236,
    vertical: { left: V_COL.left, top: 1100 },
    inAt: 2.75,
    outAt: 6.9,
  },
  {
    icon: "thermometer",
    label: "Heat index",
    value: "22°C",
    tone: C.amber,
    top: 356,
    vertical: { left: V_COL.right, top: 1100 },
    inAt: 3.1,
    outAt: 6.95,
  },
  {
    icon: "wind",
    label: "PM2.5",
    value: "18 µg/m³",
    tone: C.mint,
    top: 476,
    vertical: { left: V_COL.left, top: 1210 },
    inAt: 3.3,
    outAt: 7.0,
  },
  {
    icon: "cloud-rain",
    label: "Rain chance",
    value: "60% after 2pm",
    tone: C.sky,
    top: 596,
    vertical: { left: V_COL.right, top: 1210 },
    inAt: 3.5,
    outAt: 7.05,
  },
  {
    icon: "mountain",
    label: "Elevation",
    value: "1,540 m",
    tone: C.mint,
    top: 716,
    vertical: { left: V_COL.centre, top: 1320 },
    inAt: 3.7,
    outAt: 7.1,
  },
  // B
  {
    icon: "bell",
    label: "If you’re in danger",
    value: "Call 911",
    tone: C.coral,
    top: 300,
    vertical: { left: V_COL.left, top: 1350 },
    inAt: 10.9,
    outAt: 14.1,
  },
  {
    icon: "map-pin",
    label: "One tap opens",
    value: "Google Maps",
    tone: C.mint,
    top: 486,
    vertical: { left: V_COL.right, top: 1350 },
    inAt: 13.55,
    outAt: 14.15,
  },
  // lock screen
  {
    icon: "bell",
    label: "Reminder",
    value: "6pm, the day before",
    tone: C.amber,
    top: 330,
    vertical: { left: V_COL.centre, top: 1130 },
    inAt: 15.6,
    outAt: 18.15,
  },
  {
    icon: "cloud-rain",
    label: "Forecast re-checked",
    value: "Rain moved in",
    tone: C.sky,
    top: 450,
    vertical: { left: V_COL.centre, top: 1240 },
    inAt: 15.85,
    outAt: 18.2,
  },
];

function chatA(t: number) {
  const sent = t >= 2.5;
  const items: Item[] = [
    { kind: "user", text: A_QUESTION, grow: p(t, 2.55, 0.35) },
  ];

  if (t < 4.2) {
    items.push({
      kind: "checking",
      grow: p(t, 2.85, 0.3),
      pulse: 0.5 + 0.5 * Math.cos((t - 2.85) * 5),
    });
  } else {
    items.push({
      kind: "assistant",
      text: streamWords(A_REPLY, p(t, 4.2, 2.1, linear)),
      grow: p(t, 4.2, 0.25),
    });
  }

  return {
    clock: "9:41",
    title: "Travel Health",
    nextTitle: "Baguio air with asthma",
    titleSwap: p(t, 6.55, 0.4),
    empty: {
      opacity: 1 - p(t, 2.5, 0.25),
      touch: { index: 1, touch: touch(t, 1.45, 1.75) },
    },
    composer: {
      // EmptyState's onSuggestionPress fills the composer; it does not send.
      text: t >= 1.92 && !sent ? A_QUESTION : "",
      caret: false,
      send: touch(t, 2.15, 2.4),
    },
    items,
  };
}

function chatB(t: number) {
  const sent = t >= 9.55;
  const items: Item[] = [
    { kind: "user", text: B_QUESTION, grow: p(t, 9.6, 0.35) },
  ];

  if (t < 10.6) {
    items.push({
      kind: "checking",
      grow: p(t, 9.9, 0.3),
      pulse: 0.5 + 0.5 * Math.cos((t - 9.9) * 5),
    });
  } else {
    items.push({
      kind: "assistant",
      text: streamWords(B_REPLY, p(t, 10.6, 1.45, linear)),
      grow: p(t, 10.6, 0.25),
      safe: {
        places: B_PLACES,
        header: p(t, 12.1, 0.3),
        rows: B_PLACES.map((_, i) => p(t, 12.25 + i * 0.15, 0.35)),
        footer: p(t, 12.75, 0.3),
        touchRow: { index: 0, touch: touch(t, 13.2, 13.45) },
      },
    });
  }

  return {
    clock: "5:38",
    title: "Travel Health",
    nextTitle: "Lost near Sagada",
    titleSwap: p(t, 11.2, 0.4),
    empty: { opacity: 1 - p(t, 9.55, 0.25) },
    composer: {
      text: sent ? "" : typeChars(B_QUESTION, p(t, 7.85, 1.35, linear)),
      caret: !sent && (t < 9.2 || Math.floor(t * 2.5) % 2 === 0),
      send: touch(t, 9.3, 9.45),
    },
    items: sent ? items : [],
  };
}

export const PhoneStage: React.FC = () => {
  const t = useSeconds();
  const vertical = useVertical();
  const phone = vertical ? V_PHONE : PHONE;
  const travel = vertical ? 1350 : 1150;

  const enter = springAt(t, 0, { damping: 18, stiffness: 80, mass: 1.1 });
  const exit = p(t, 18.5, 0.7, ease.in);
  const toB = p(t, 7.35, 0.4, ease.inOut);
  const toLock = p(t, 14.35, 0.45, ease.inOut);

  const y =
    (1 - enter) * travel + exit * travel + Math.sin(t * 1.4) * 5 * enter;
  const rotate = (1 - enter) * 7 - exit * 5;

  const layers = [
    { key: "a", opacity: 1 - toB, node: <ChatScreen {...chatA(t)} /> },
    {
      key: "b",
      opacity: toB * (1 - toLock),
      node: <ChatScreen {...chatB(t)} />,
    },
    {
      key: "lock",
      opacity: toLock,
      node: (
        <LockScreen
          notification={springAt(t, 15.1, { damping: 16, stiffness: 150 })}
        />
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: phone.x,
          top: phone.y,
          transform: `translateY(${y}px) rotate(${rotate}deg)`,
        }}
      >
        <PhoneFrame>
          {layers.map(
            ({ key, opacity, node }) =>
              opacity > 0 && (
                <div
                  key={key}
                  style={{ position: "absolute", inset: 0, opacity }}
                >
                  {node}
                </div>
              ),
          )}
        </PhoneFrame>
      </div>

      {CHIPS.map((chip) => (
        <SideChip
          key={`${chip.label}${chip.inAt}`}
          chip={chip}
          t={t}
          left={vertical ? chip.vertical.left : CHIP_X}
          top={vertical ? chip.vertical.top : chip.top}
          width={vertical ? V_CHIP_W : undefined}
          rise={vertical}
        />
      ))}
    </>
  );
};
