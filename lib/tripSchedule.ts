/**
 * Date arithmetic for trip reminders.
 *
 * Dependency-free so both the Convex mutation that schedules a reminder and
 * the tests can use it. This is the part of the feature most likely to be
 * subtly wrong, which is why it is pure and covered.
 */

/**
 * The Philippines is UTC+8 year-round with no daylight saving, so a fixed
 * offset is correct here rather than a lazy approximation. It is also why
 * "the day before" cannot be computed in UTC: 2026-09-11 in Manila starts at
 * 2026-09-10T16:00Z, so UTC-based arithmetic lands a reminder on the wrong day
 * for anything scheduled in the evening.
 */
export const PH_UTC_OFFSET_HOURS = 8;

/** Early evening the day before — late enough to be packing, early enough to shop. */
export const REMINDER_HOUR_PHT = 18;

const HOUR_MS = 60 * 60 * 1000;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ParsedTripDate = {
  year: number;
  month: number;
  day: number;
};

/**
 * Parses a `YYYY-MM-DD` trip date, rejecting anything that is not a real
 * calendar day.
 *
 * Strict on purpose: the date arrives from a language model resolving phrases
 * like "September 11" or "next Friday", and "2026-09-31" or "2026-02-30" are
 * exactly the sort of thing that comes back. Returns null rather than throwing
 * so the caller can tell the model what was wrong.
 */
export function parseTripDate(value: string): ParsedTripDate | null {
  const match = ISO_DATE.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Round-trip through UTC to reject overflow: Date.UTC(2026, 8, 31) silently
  // becomes 1 October, so comparing the parts back is what catches it.
  const asUtc = new Date(Date.UTC(year, month - 1, day));

  if (
    asUtc.getUTCFullYear() !== year ||
    asUtc.getUTCMonth() !== month - 1 ||
    asUtc.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/** Midnight on a Philippine calendar date, as an epoch millisecond value. */
export function startOfTripDayUtcMs(date: ParsedTripDate): number {
  return (
    Date.UTC(date.year, date.month - 1, date.day) -
    PH_UTC_OFFSET_HOURS * HOUR_MS
  );
}

/**
 * When the reminder should fire: `REMINDER_HOUR_PHT` on the day before the
 * trip, expressed in epoch milliseconds.
 *
 * `Date.UTC` normalizes a day of 0 into the last day of the previous month, so
 * a trip on the 1st correctly reminds on the last day of the month before.
 */
export function reminderTimeUtcMs(date: ParsedTripDate): number {
  return (
    Date.UTC(date.year, date.month - 1, date.day - 1) +
    (REMINDER_HOUR_PHT - PH_UTC_OFFSET_HOURS) * HOUR_MS
  );
}

/** The Philippine calendar date at a given instant, as `YYYY-MM-DD`. */
export function philippineDateString(nowMs: number): string {
  const shifted = new Date(nowMs + PH_UTC_OFFSET_HOURS * HOUR_MS);

  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * The hour of the Philippine day, 0-23.
 *
 * Split out from the time string because the two callers want different
 * things: the system instruction shows the traveller's clock to the model,
 * while components/DestinationCard.tsx only needs to know whether it is dark
 * enough that suggesting a walk would be wrong.
 */
export function philippineHour(nowMs: number): number {
  return new Date(nowMs + PH_UTC_OFFSET_HOURS * HOUR_MS).getUTCHours();
}

/**
 * The Philippine wall clock as `HH:MM`.
 *
 * The model has had the date since trip reminders shipped and never the time,
 * so it could not tell a 3pm walk from a 5:45pm one. In a country where sunset
 * lands between about 5:30pm and 6:20pm all year with almost no twilight, and
 * provincial roads have no lighting, that difference is the whole risk.
 */
export function philippineTimeString(nowMs: number): string {
  const shifted = new Date(nowMs + PH_UTC_OFFSET_HOURS * HOUR_MS);

  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export type TripScheduling =
  | { kind: "scheduled"; remindAtMs: number }
  | { kind: "too-late"; reason: string }
  | { kind: "invalid-date"; reason: string };

/**
 * Decides whether a trip can carry a reminder.
 *
 * A trip in the past, or one whose reminder window has already closed, is
 * still worth saving — the traveller may want advice about tomorrow — but it
 * must not silently pretend a reminder was set.
 */
export function planTripReminder(
  tripDate: string,
  nowMs: number,
): TripScheduling {
  const parsed = parseTripDate(tripDate);

  if (!parsed) {
    return {
      kind: "invalid-date",
      reason: `"${tripDate}" is not a real calendar date in YYYY-MM-DD form.`,
    };
  }

  if (startOfTripDayUtcMs(parsed) + 24 * HOUR_MS <= nowMs) {
    return {
      kind: "too-late",
      reason: `${tripDate} has already passed.`,
    };
  }

  const remindAtMs = reminderTimeUtcMs(parsed);

  if (remindAtMs <= nowMs) {
    return {
      kind: "too-late",
      reason: `The day-before reminder for ${tripDate} would already have gone out.`,
    };
  }

  return { kind: "scheduled", remindAtMs };
}
