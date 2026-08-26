import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RecordEvent } from "@/features/match-records/types";
import { MatchRecordTimeline } from "./match-record-timeline";

const MATCH_ID = "11111111-1111-4111-8111-111111111111";

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
    subjectMatchRosterId: null,
    payload: { side: "home", shirt_number: 7, display_name: "鈴木" },
    createdAt: "2026-08-26T09:00:00.000Z",
    ...overrides,
  };
}

describe("MatchRecordTimeline", () => {
  it("renders chronological handball records and preserves corrections", () => {
    const warning = event({
      id: "40000000-0000-4000-8000-000000000001",
      stateVersion: 2,
      eventType: "warning",
      periodElapsedMs: 660_000,
      competitionElapsedMs: 660_000,
      payload: { shirt_number: 4, display_name: "山田" },
    });
    const correction = event({
      id: "40000000-0000-4000-8000-000000000002",
      stateVersion: 3,
      eventType: "event_reverted",
      relatedEventId: warning.id,
      periodElapsedMs: 670_000,
      competitionElapsedMs: 670_000,
      payload: { reason: "入力訂正", target_event_type: "warning" },
    });

    const html = renderToStaticMarkup(
      <MatchRecordTimeline
        events={[event({ id: "40000000-0000-4000-8000-000000000003", stateVersion: 1 }), warning, correction]}
        homeName="自チーム"
        awayName="相手チーム"
        periodCount={2}
      />,
    );

    expect(html).toContain("タイムライン");
    expect(html).toContain("前半 09:05");
    expect(html).toContain("得点");
    expect(html).toContain("#7 鈴木");
    expect(html).toContain("自チーム");
    expect(html).toContain("警告");
    expect(html).toContain("#4 山田");
    expect(html).toContain("訂正済み");
    expect(html).toContain("訂正");
    expect(html).toContain("入力訂正");
  });

  it("shows an informative empty state before any records exist", () => {
    const html = renderToStaticMarkup(
      <MatchRecordTimeline events={[]} homeName="自チーム" awayName="相手チーム" periodCount={2} />,
    );

    expect(html).toContain("まだ試合記録はありません");
    expect(html).toContain("MATCH CONSOLE");
  });
});
