import { describe, expect, it } from "vitest";
import {
  buildRecordTimeline,
  formatRecordClock,
  formatRecordSubject,
  recordEventLabel,
} from "./presentation";
import type { RecordEvent } from "./types";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";

function event(overrides: Partial<RecordEvent> = {}): RecordEvent {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    matchId: MATCH_ID,
    stateVersion: 1,
    eventType: "goal",
    relatedEventId: null,
    period: 1,
    periodElapsedMs: 9 * 60_000 + 5_000,
    competitionElapsedMs: 9 * 60_000 + 5_000,
    subjectSide: "home",
    subjectTeamMemberId: null,
    subjectMatchRosterId: null,
    payload: { side: "home" },
    createdAt: "2026-08-26T09:00:00.000Z",
    ...overrides,
  };
}

describe("match record presentation", () => {
  it("formats official period clock labels in Japanese", () => {
    expect(formatRecordClock(event())).toBe("前半 09:05");
    expect(formatRecordClock(event({ period: 2, periodElapsedMs: 18 * 60_000 + 21_000 }))).toBe("後半 18:21");
    expect(formatRecordClock(event({ period: 3, periodElapsedMs: 3 * 60_000 + 4_000 }))).toBe("延長1 03:04");
    expect(formatRecordClock(event({ period: null, periodElapsedMs: null }))).toBe("時刻未記録");
  });

  it("uses handball-specific Japanese labels", () => {
    expect(recordEventLabel(event({ payload: { side: "home", goal_method: "seven_meter" } }))).toBe("7m得点");
    expect(recordEventLabel(event({ eventType: "seven_meter_missed" }))).toBe("7m失敗");
    expect(recordEventLabel(event({ eventType: "warning" }))).toBe("警告");
    expect(recordEventLabel(event({ eventType: "suspension", payload: { suspension_count: 3, resulting_disqualification: true } }))).toBe("2分間退場（3回目・失格）");
    expect(recordEventLabel(event({ eventType: "disqualification", payload: { report_required: true } }))).toBe("失格（報告書あり）");
    expect(recordEventLabel(event({ eventType: "team_timeout" }))).toBe("チームタイムアウト");
  });

  it("formats participant snapshots without requiring live roster data", () => {
    expect(formatRecordSubject(event({ payload: { shirt_number: 7, display_name: "鈴木" } }))).toBe("#7 鈴木");
    expect(formatRecordSubject(event({ payload: { shirt_number: 12 } }))).toBe("#12");
    expect(formatRecordSubject(event({ payload: { display_name: "相手選手" } }))).toBe("相手選手");
    expect(formatRecordSubject(event({ payload: {} }))).toBeNull();
  });

  it("merges post-goal scorer attribution into the original goal timeline row", () => {
    const goal = event({
      id: "30000000-0000-4000-8000-000000000001",
      stateVersion: 3,
      periodElapsedMs: 11 * 60_000 + 9_000,
      payload: { side: "home" },
    });
    const attribution = event({
      id: "30000000-0000-4000-8000-000000000002",
      stateVersion: 4,
      eventType: "goal_attributed",
      relatedEventId: goal.id,
      subjectMatchRosterId: "30000000-0000-4000-8000-000000000003",
      payload: { side: "home", shirt_number: 9, display_name: "佐藤" },
    });

    const timeline = buildRecordTimeline([goal, attribution]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({
      eventId: goal.id,
      label: "得点",
      clock: "前半 11:09",
      subject: "#9 佐藤",
      reverted: false,
      correction: false,
    });
  });

  it("preserves correction history while marking the original record as reverted", () => {
    const warning = event({
      id: "40000000-0000-4000-8000-000000000001",
      stateVersion: 5,
      eventType: "warning",
      payload: { shirt_number: 4, display_name: "山田" },
    });
    const correction = event({
      id: "40000000-0000-4000-8000-000000000002",
      stateVersion: 6,
      eventType: "event_reverted",
      relatedEventId: warning.id,
      payload: { reason: "入力訂正", target_event_type: "warning" },
    });

    const timeline = buildRecordTimeline([warning, correction]);

    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toMatchObject({ eventId: warning.id, label: "警告", reverted: true, correction: false });
    expect(timeline[1]).toMatchObject({ eventId: correction.id, label: "訂正", reverted: false, correction: true });
  });
});
