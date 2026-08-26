import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RecordEvent } from "@/features/match-records/types";
import { MatchRecordSummary } from "./match-record-summary";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";
const ROSTER_ID = "22222222-2222-4222-8222-222222222222";

function event(overrides: Partial<RecordEvent>): RecordEvent {
  return {
    id: crypto.randomUUID(),
    matchId: MATCH_ID,
    stateVersion: 1,
    eventType: "goal",
    relatedEventId: null,
    period: 1,
    periodElapsedMs: 545_000,
    competitionElapsedMs: 545_000,
    subjectSide: "home",
    subjectTeamMemberId: null,
    subjectMatchRosterId: ROSTER_ID,
    payload: { shirt_number: 7, display_name: "鈴木" },
    createdAt: "2026-08-26T09:00:00.000Z",
    ...overrides,
  };
}

describe("MatchRecordSummary", () => {
  it("renders player totals, goal times and team timeouts", () => {
    const events = [
      event({ id: "30000000-0000-4000-8000-000000000001", stateVersion: 1 }),
      event({
        id: "30000000-0000-4000-8000-000000000002",
        stateVersion: 2,
        eventType: "goal",
        periodElapsedMs: 720_000,
        competitionElapsedMs: 720_000,
        payload: { shirt_number: 7, display_name: "鈴木", goal_method: "seven_meter" },
      }),
      event({ id: "30000000-0000-4000-8000-000000000003", stateVersion: 3, eventType: "warning" }),
      event({
        id: "30000000-0000-4000-8000-000000000004",
        stateVersion: 4,
        eventType: "suspension",
        payload: { shirt_number: 7, display_name: "鈴木", suspension_count: 1 },
      }),
      event({
        id: "30000000-0000-4000-8000-000000000005",
        stateVersion: 5,
        eventType: "team_timeout",
        subjectMatchRosterId: null,
        periodElapsedMs: 900_000,
        competitionElapsedMs: 900_000,
        payload: {},
      }),
    ];

    const html = renderToStaticMarkup(
      <MatchRecordSummary events={events} homeName="自チーム" awayName="相手チーム" periodCount={2} />,
    );

    expect(html).toContain("選手別サマリー");
    expect(html).toContain("#7 鈴木");
    expect(html).toContain("2得点");
    expect(html).toContain("09:05");
    expect(html).toContain("12:00");
    expect(html).toContain("7m 1/1");
    expect(html).toContain("警告 1");
    expect(html).toContain("2分 1");
    expect(html).toContain("失格 0");
    expect(html).toContain("自チーム TTO");
    expect(html).toContain("前半 15:00");
  });
});
