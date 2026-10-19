import { AbsoluteFill } from "remotion";
import { Icon } from "../Icon";
import type { IconName } from "../icons";
import { C, UI, type Touch } from "../theme";
import { Grow, HomeIndicator, StatusBar, TouchDot } from "./parts";

/*
 * A static re-drawing of the app's chat screen: ChatHeader, EmptyState,
 * ChatMessage, SafePlaces and ChatComposer, with the same copy and the same
 * light-theme tokens. Every prop is a value for the current frame; the
 * timeline that drives them lives in PhoneStage.
 */

// components/EmptyState.tsx
export const SUGGESTIONS = [
  "Is it safe to hike Mount Apo tomorrow?",
  "I have asthma — how is the air in Baguio?",
  "Which hospitals are near Lake Sebu?",
];

export type SafePlace = { icon: IconName; name: string; meta: string };

export type SafeState = {
  places: SafePlace[];
  header: number;
  rows: number[];
  footer: number;
  touchRow?: { index: number; touch: Touch };
};

export type Item =
  | { kind: "user"; text: string; grow: number }
  | { kind: "checking"; grow: number; pulse: number }
  | { kind: "assistant"; text: string; grow: number; safe?: SafeState };

export type ChatScreenProps = {
  clock: string;
  title: string;
  nextTitle?: string;
  titleSwap?: number;
  empty: { opacity: number; touch?: { index: number; touch: Touch } };
  composer: { text: string; caret: boolean; send?: Touch };
  items: Item[];
};

const bubble: React.CSSProperties = {
  borderRadius: 20,
  background: C.muted,
  padding: "11px 17px",
  fontSize: 17.5,
  lineHeight: 1.48,
  color: C.fg,
};

const Header: React.FC<
  Pick<ChatScreenProps, "title" | "nextTitle" | "titleSwap">
> = ({ title, nextTitle, titleSwap = 0 }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 11,
      padding: "11px 18px 12px 22px",
      borderBottom: `1px solid ${C.border}`,
      background: C.paper,
    }}
  >
    <Icon name="cloud-sun" size={30} color={C.pine} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ position: "relative", height: 24, overflow: "hidden" }}>
        {[
          { text: title, y: -titleSwap * 24, o: 1 - titleSwap },
          { text: nextTitle, y: (1 - titleSwap) * 24, o: titleSwap },
        ].map(
          ({ text, y, o }, i) =>
            text &&
            o > 0 && (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  color: C.fg,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transform: `translateY(${y}px)`,
                  opacity: o,
                }}
              >
                {text}
              </div>
            ),
        )}
      </div>
      <div style={{ fontSize: 13.5, color: C.fgMuted, marginTop: 1 }}>
        Philippines · live conditions
      </div>
    </div>
    <Icon name="ellipsis-vertical" size={24} color={C.fg} />
  </div>
);

const EmptyState: React.FC<ChatScreenProps["empty"]> = ({ opacity, touch }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "0 22px 30px",
      opacity,
    }}
  >
    <div
      style={{
        fontSize: 26,
        fontWeight: 700,
        color: C.fg,
        letterSpacing: "-0.01em",
      }}
    >
      Where are you headed?
    </div>
    <div style={{ fontSize: 15.5, color: C.fgMuted, marginTop: 6 }}>
      Ask about conditions, health risks, or care nearby.
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 26,
      }}
    >
      {SUGGESTIONS.map((suggestion, i) => {
        const pressed = touch?.index === i ? touch.touch.press : 0;
        return (
          <div
            key={suggestion}
            style={{
              position: "relative",
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: pressed > 0.3 ? C.accent : C.card,
              padding: "14px 18px",
              fontSize: 16,
              lineHeight: 1.4,
              color: C.fg,
              transform: `scale(${1 - pressed * 0.02})`,
            }}
          >
            {suggestion}
            {touch?.index === i && <TouchDot touch={touch.touch} />}
          </div>
        );
      })}
    </div>
  </div>
);

const SafePlacesCard: React.FC<SafeState> = ({
  places,
  header,
  rows,
  footer,
  touchRow,
}) => (
  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
    <Grow p={header} max={30}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 9,
        }}
      >
        <Icon name="navigation" size={14} color={C.fgMuted} />
        <span
          style={{
            fontSize: 13,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: C.fgMuted,
          }}
        >
          Head for safety
        </span>
      </div>
    </Grow>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {places.map((place, i) => {
        const touch = touchRow?.index === i ? touchRow.touch : undefined;
        return (
          <Grow key={place.name} p={rows[i] ?? 0} max={80}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 11,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                background: touch && touch.press > 0.3 ? C.accent : C.card,
                padding: "11px 12px 11px 14px",
              }}
            >
              <Icon name={place.icon} size={22} color={C.pine} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: C.fg,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {place.name}
                </div>
                <div style={{ fontSize: 13.5, color: C.fgMuted, marginTop: 1 }}>
                  {place.meta}
                </div>
              </div>
              <Icon name="chevron-right" size={20} color={C.fgMuted} />
              <TouchDot touch={touch} style={{ left: "38%" }} />
            </div>
          </Grow>
        );
      })}
    </div>
    <Grow p={footer} max={60}>
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.45,
          color: C.fgMuted,
          marginTop: 9,
        }}
      >
        Straight-line distance — tap for directions in Google Maps. Call 911 if
        you are in danger.
      </div>
    </Grow>
  </div>
);

const Message: React.FC<{ item: Item }> = ({ item }) => {
  if (item.kind === "user") {
    return (
      <Grow p={item.grow} max={110}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "10px 22px",
          }}
        >
          <div style={{ ...bubble, maxWidth: "80%" }}>{item.text}</div>
        </div>
      </Grow>
    );
  }

  if (item.kind === "checking") {
    return (
      <Grow p={item.grow} max={50}>
        <div
          style={{
            padding: "10px 22px",
            fontSize: 15.5,
            color: C.fgMuted,
            opacity: 0.55 + 0.45 * item.pulse,
          }}
        >
          Checking conditions...
        </div>
      </Grow>
    );
  }

  return (
    <Grow p={item.grow} max={60}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "10px 22px",
        }}
      >
        <div style={bubble}>{item.text}</div>
        {item.safe && <SafePlacesCard {...item.safe} />}
      </div>
    </Grow>
  );
};

const Composer: React.FC<ChatScreenProps["composer"]> = ({
  text,
  caret,
  send,
}) => {
  const caretEl = caret && (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: 21,
        marginLeft: 1,
        marginRight: 1,
        verticalAlign: "text-bottom",
        background: C.pine,
      }}
    />
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        padding: "12px 16px",
        borderTop: `1px solid ${C.border}`,
        background: C.paper,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          border: `1px solid ${C.border}`,
          background: C.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="map-pin" size={20} color={C.fg} />
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 46,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          background: C.card,
          padding: "11px 14px",
          fontSize: 16.5,
          lineHeight: 1.4,
          color: text ? C.fg : C.fgMuted,
        }}
      >
        {text ? (
          <>
            {text}
            {caretEl}
          </>
        ) : (
          <>
            {caretEl}
            Ask about your trip...
          </>
        )}
      </div>

      <div
        style={{
          position: "relative",
          width: 46,
          height: 46,
          borderRadius: 23,
          background: C.pine,
          opacity: text ? 1 : 0.4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 - (send?.press ?? 0) * 0.08})`,
        }}
      >
        <Icon name="send" size={20} color={C.pineInk} />
        <TouchDot touch={send} />
      </div>
    </div>
  );
};

export const ChatScreen: React.FC<ChatScreenProps> = (props) => (
  <AbsoluteFill style={{ background: C.paper, fontFamily: UI, color: C.fg }}>
    <StatusBar clock={props.clock} />
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        title={props.title}
        nextTitle={props.nextTitle}
        titleSwap={props.titleSwap}
      />
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {props.empty.opacity > 0 && <EmptyState {...props.empty} />}
        <div style={{ paddingTop: 8 }}>
          {props.items.map((item, i) => (
            <Message key={i} item={item} />
          ))}
        </div>
      </div>
      <Composer {...props.composer} />
      <div style={{ height: 30, background: C.paper }} />
    </div>
    <HomeIndicator />
  </AbsoluteFill>
);
