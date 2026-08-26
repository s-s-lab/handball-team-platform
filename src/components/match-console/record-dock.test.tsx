import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ConsoleParticipant, ConsoleSnapshot } from "@/features/match-console/types";
import type { RecordEvent } from "@/features/match-records/types";
import { RecordDock } from "./record-dock";

const participant: ConsoleParticipant = {
  matchRosterId: "10000000-0000-4000-8000-000000000001",
  teamMemberId: "10000000-0000-4000-8000-000000000002",
  kind: "player",
  displayName: "鈴木",
  shirtNumber: 7,
  primaryPosition: "RB",
};

const snapshot: ConsoleSnapshot = {
  matchId: "20000000-0000-4000-8000-000000000001",
  version: 4,
  currentPeriod: 1,
  clockElapsedMs: 600_000,
  competitionElapsedMs: 600_000,
  clockRunning: false,
  clockStartedAt: null,
  homeScore: 1,
  awayScore: 0,
  matchStatus: "live",
  periodDurationMs: 1_800_000,
  serverNow: "2026-08-26T08:00:00.000Z",
};

function event(overrides: Partial<RecordEvent>): RecordEvent {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    matchId: snapshot.matchId,
    stateVersion: 1,
    eventType: "goal",
    relatedEventId: null,
    period: 1,
    periodElapsedMs: 540_000,
    competitionElapsedMs: 540_000,
    subjectSide: "home",
    subjectTeamMemberId: null,
    subjectMatchRosterId: null,
    payload: { side: "home" },
    createdAt: "2026-08-26T08:00:00.000Z",
    ...overrides,
  };
}

describe("RecordDock", () => {
  it("keeps the handball record actions visible with large labels", () => {
    const html = renderToStaticMarkup(
      <RecordDock
        managedSide="home"
        homeName="HOME TEAM"
        awayName="AWAY TEAM"
        participants={[participant]}
        snapshot={snapshot}
        displayElapsedMs={snapshot.clockElapsedMs}
        events={[]}
        disabled={false}
        onAction={async () => undefined}
      />,
    );

    for (const label of ["7m", "警告", "2分", "失格", "TTO", "記録"]) {
      expect(html).toContain(label);
    }
  });

  it("shows active suspension remaining time from competition time", () => {
    const suspension = event({
      eventType: "suspension",
      subjectMatchRosterId: participant.matchRosterId,
      subjectTeamMemberId: participant.teamMemberId,
      payload: {
        shirt_number: 7,
        display_name: "鈴木",
        suspension_count: 1,
        expires_at_competition_elapsed_ms: 690_000,
      },
    });
    const html = renderToStaticMarkup(
      <RecordDock
        managedSide="home"
        homeName="HOME TEAM"
        awayName="AWAY TEAM"
        participants={[participant]}
        snapshot={snapshot}
        displayElapsedMs={snapshot.clockElapsedMs}
        events={[suspension]}
        disabled={false}
        onAction={async () => undefined}
      />,
    );

    expect(html).toContain("退場中");
    expect(html).toContain("#7");
    expect(html).toContain("1:30");
  });

  it("prompts for a scorer after an unattributed goal", () => {
    const html = renderToStaticMarkup(
      <RecordDock
        managedSide="home"
        homeName="HOME TEAM"
        awayName="AWAY TEAM"
        participants={[participant]}
        snapshot={snapshot}
        displayElapsedMs={snapshot.clockElapsedMs}
        events={[event({ eventType: "goal" })]}
        disabled={false}
        onAction={async () => undefined}
      />,
    );

    expect(html).toContain("得点者を記録");
    expect(html).toContain("09:00");
    expect(html).toContain("鈴木");
  });
});
