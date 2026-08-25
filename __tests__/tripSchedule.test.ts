import { describe, expect, it } from "vitest";
import {
  parseTripDate,
  philippineDateString,
  philippineHour,
  philippineTimeString,
  planTripReminder,
  reminderTimeUtcMs,
  startOfTripDayUtcMs,
} from "@/lib/tripSchedule";

/** 2026-09-11 18:00 Philippine time, as an unambiguous UTC instant. */
const SEPT_10_18_00_PHT = Date.UTC(2026, 8, 10, 10, 0, 0);

describe("parseTripDate", () => {
  it("accepts a real date", () => {
    expect(parseTripDate("2026-09-11")).toEqual({
      year: 2026,
      month: 9,
      day: 11,
    });
  });

  it("rejects days that do not exist in that month", () => {
    // Date.UTC silently rolls these forward, which is exactly the trap.
    expect(parseTripDate("2026-09-31")).toBeNull();
    expect(parseTripDate("2026-02-30")).toBeNull();
    expect(parseTripDate("2026-13-01")).toBeNull();
  });

  it("accepts 29 February only in a leap year", () => {
    expect(parseTripDate("2028-02-29")).not.toBeNull();
    expect(parseTripDate("2026-02-29")).toBeNull();
  });

  it("rejects anything that is not YYYY-MM-DD", () => {
    for (const bad of [
      "11-09-2026",
      "2026-9-11",
      "September 11",
      "",
      "2026-09-11T00:00",
    ]) {
      expect(parseTripDate(bad)).toBeNull();
    }
  });
});

describe("startOfTripDayUtcMs", () => {
  it("treats the date as Philippine midnight, not UTC midnight", () => {
    // 2026-09-11 00:00+08:00 is 2026-09-10 16:00Z.
    expect(startOfTripDayUtcMs({ year: 2026, month: 9, day: 11 })).toBe(
      Date.UTC(2026, 8, 10, 16, 0, 0),
    );
  });
});

describe("reminderTimeUtcMs", () => {
  it("fires at 18:00 Philippine time the day before", () => {
    expect(reminderTimeUtcMs({ year: 2026, month: 9, day: 11 })).toBe(
      SEPT_10_18_00_PHT,
    );
  });

  it("rolls back across a month boundary", () => {
    // A trip on 1 October reminds on 30 September.
    expect(reminderTimeUtcMs({ year: 2026, month: 10, day: 1 })).toBe(
      Date.UTC(2026, 8, 30, 10, 0, 0),
    );
  });

  it("rolls back across a year boundary", () => {
    expect(reminderTimeUtcMs({ year: 2027, month: 1, day: 1 })).toBe(
      Date.UTC(2026, 11, 31, 10, 0, 0),
    );
  });
});

describe("philippineDateString", () => {
  it("uses the Philippine day, not the UTC day", () => {
    // 2026-09-10 17:00Z is already 2026-09-11 in Manila.
    expect(philippineDateString(Date.UTC(2026, 8, 10, 17, 0, 0))).toBe(
      "2026-09-11",
    );
    expect(philippineDateString(Date.UTC(2026, 8, 10, 15, 0, 0))).toBe(
      "2026-09-10",
    );
  });
});

describe("planTripReminder", () => {
  const now = Date.UTC(2026, 7, 14, 2, 0, 0); // mid-August 2026

  it("schedules a future trip", () => {
    expect(planTripReminder("2026-09-11", now)).toEqual({
      kind: "scheduled",
      remindAtMs: SEPT_10_18_00_PHT,
    });
  });

  it("reports an unusable date rather than throwing", () => {
    const result = planTripReminder("2026-02-30", now);

    expect(result.kind).toBe("invalid-date");
  });

  it("refuses a trip that has already happened", () => {
    expect(planTripReminder("2026-07-01", now).kind).toBe("too-late");
  });

  it("refuses when the reminder window has already closed", () => {
    // Asking on the evening of the 10th about a trip on the 11th: the 18:00
    // reminder has gone. The trip is still valid, the reminder is not.
    const evening = Date.UTC(2026, 8, 10, 11, 0, 0); // 19:00 PHT
    const result = planTripReminder("2026-09-11", evening);

    expect(result.kind).toBe("too-late");
  });

  it("still schedules when asked earlier the same day", () => {
    const morning = Date.UTC(2026, 8, 10, 1, 0, 0); // 09:00 PHT
    const result = planTripReminder("2026-09-11", morning);

    expect(result).toEqual({
      kind: "scheduled",
      remindAtMs: SEPT_10_18_00_PHT,
    });
  });
});

describe("philippineTimeString / philippineHour", () => {
  // 2026-09-10T16:00:00Z is exactly midnight on the 11th in Manila. An
  // off-by-one here puts the after-dark rule on the wrong side of a whole day.
  const MIDNIGHT_PHT = Date.UTC(2026, 8, 10, 16, 0, 0);

  it("reads midnight in Manila from the previous UTC afternoon", () => {
    expect(philippineTimeString(MIDNIGHT_PHT)).toBe("00:00");
    expect(philippineHour(MIDNIGHT_PHT)).toBe(0);
    expect(philippineDateString(MIDNIGHT_PHT)).toBe("2026-09-11");
  });

  it("reads one minute before midnight as the previous day", () => {
    const justBefore = MIDNIGHT_PHT - 60 * 1000;

    expect(philippineTimeString(justBefore)).toBe("23:59");
    expect(philippineHour(justBefore)).toBe(23);
    expect(philippineDateString(justBefore)).toBe("2026-09-10");
  });

  it("puts dusk in the evening rather than the morning", () => {
    // 09:45Z is 17:45 in Manila — after sunset, and the case the walking
    // suggestion has to refuse.
    const dusk = Date.UTC(2026, 8, 11, 9, 45, 0);

    expect(philippineTimeString(dusk)).toBe("17:45");
    expect(philippineHour(dusk)).toBe(17);
  });

  it("pads single-digit hours and minutes", () => {
    expect(philippineTimeString(Date.UTC(2026, 0, 1, 1, 5, 0))).toBe("09:05");
    expect(philippineTimeString(Date.UTC(2026, 0, 1, 20, 3, 0))).toBe("04:03");
  });
});
