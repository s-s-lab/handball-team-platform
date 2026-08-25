import { describe, expect, it } from "vitest";
import { effectiveElapsedMs, formatClock, periodDurationMs } from "./runtime";

const baseSnapshot = {
  currentPeriod: 1,
  clockElapsedMs: 0,
  clockRunning: false,
  clockStartedAt: null as string | null,
  rules: {
    periodCount: 2,
    periodSeconds: 1800,
    overtimeEnabled: true,
    overtimePeriodCount: 2,
    overtimePeriodSeconds: 300,
  },
};

describe("periodDurationMs", () => {
  it("uses normal period duration inside regulation", () => {
    expect(periodDurationMs(baseSnapshot)).toBe(1_800_000);
    expect(periodDurationMs({ ...baseSnapshot, currentPeriod: 2 })).toBe(1_800_000);
  });

  it("uses overtime duration after regulation periods", () => {
    expect(periodDurationMs({ ...baseSnapshot, currentPeriod: 3 })).toBe(300_000);
    expect(periodDurationMs({ ...baseSnapshot, currentPeriod: 4 })).toBe(300_000);
  });
});

describe("effectiveElapsedMs", () => {
  it("returns persisted elapsed time while stopped", () => {
    const snapshot = { ...baseSnapshot, clockElapsedMs: 42_500 };
    expect(effectiveElapsedMs(snapshot, Date.parse("2026-08-25T12:00:00.000Z"))).toBe(42_500);
  });

  it("adds server-time delta while running", () => {
    const snapshot = {
      ...baseSnapshot,
      clockElapsedMs: 10_000,
      clockRunning: true,
      clockStartedAt: "2026-08-25T12:00:00.000Z",
    };
    expect(effectiveElapsedMs(snapshot, Date.parse("2026-08-25T12:00:05.250Z"))).toBe(15_250);
  });

  it("never returns a negative value when the supplied clock is behind the anchor", () => {
    const snapshot = {
      ...baseSnapshot,
      clockElapsedMs: 2_000,
      clockRunning: true,
      clockStartedAt: "2026-08-25T12:00:10.000Z",
    };
    expect(effectiveElapsedMs(snapshot, Date.parse("2026-08-25T12:00:00.000Z"))).toBe(2_000);
  });

  it("clamps a running clock to the current period duration", () => {
    const snapshot = {
      ...baseSnapshot,
      clockElapsedMs: 1_799_000,
      clockRunning: true,
      clockStartedAt: "2026-08-25T12:00:00.000Z",
    };
    expect(effectiveElapsedMs(snapshot, Date.parse("2026-08-25T12:00:05.000Z"))).toBe(1_800_000);
  });
});

describe("formatClock", () => {
  it("formats zero", () => expect(formatClock(0)).toBe("00:00"));
  it("formats 18 minutes 42 seconds", () => expect(formatClock(1_122_000)).toBe("18:42"));
  it("formats an exact 30 minute period end", () => expect(formatClock(1_800_000)).toBe("30:00"));
  it("floors sub-second values", () => expect(formatClock(1_999)).toBe("00:01"));
});
