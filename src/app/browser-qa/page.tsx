import { notFound } from "next/navigation";
import { MatchConsole } from "@/components/match-console/match-console";
import type { MatchConsoleData } from "@/features/match-console/types";

const MATCH_ID = "00000000-0000-4000-8000-000000000007";

function buildBrowserQaData(): MatchConsoleData {
  return {
    matchId: MATCH_ID,
    matchName: "Phase 7 Browser QA",
    teamId: "00000000-0000-4000-8000-000000000001",
    managedSide: "home",
    homeName: "QA HOME",
    awayName: "QA AWAY",
    rules: {
      periodCount: 2,
      periodSeconds: 1800,
      overtimeEnabled: true,
      overtimePeriodCount: 2,
      overtimePeriodSeconds: 300,
      teamTimeoutsPerGame: 3,
      teamTimeoutsPerPeriod: 2,
    },
    participants: [
      {
        matchRosterId: "00000000-0000-4000-8000-000000000010",
        teamMemberId: "00000000-0000-4000-8000-000000000011",
        kind: "player",
        displayName: "QA Player",
        shirtNumber: 7,
        primaryPosition: "CB",
      },
    ],
    recordEvents: [],
    snapshot: {
      matchId: MATCH_ID,
      version: 1,
      currentPeriod: 1,
      clockElapsedMs: 0,
      competitionElapsedMs: 0,
      clockRunning: false,
      clockStartedAt: null,
      homeScore: 0,
      awayScore: 0,
      matchStatus: "live",
      periodDurationMs: 1_800_000,
      serverNow: new Date().toISOString(),
    },
  };
}

export default function BrowserQaPage() {
  if (process.env.BROWSER_QA !== "1") notFound();

  return (
    <main className="min-h-screen bg-background p-3 sm:p-6">
      <MatchConsole data={buildBrowserQaData()} />
    </main>
  );
}
