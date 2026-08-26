import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MatchConsoleData } from "@/features/match-console/types";

vi.mock("@/features/match-console/actions", () => ({
  applyConsoleAction: async () => ({ ok: false, message: "not used in static render" }),
}));

import { MatchConsole } from "./match-console";

const data: MatchConsoleData = {
  matchId: "11111111-1111-4111-8111-111111111111",
  matchName: "Phase 7 Test Match",
  teamId: "22222222-2222-4222-8222-222222222222",
  managedSide: "home",
  homeName: "HOME TEAM",
  awayName: "AWAY TEAM",
  rules: {
    periodCount: 2,
    periodSeconds: 1_800,
    overtimeEnabled: true,
    overtimePeriodCount: 2,
    overtimePeriodSeconds: 300,
  },
  participants: [
    {
      matchRosterId: "33333333-3333-4333-8333-333333333333",
      teamMemberId: "44444444-4444-4444-8444-444444444444",
      kind: "player",
      displayName: "鈴木",
      shirtNumber: 7,
      primaryPosition: "RB",
    },
  ],
  recordEvents: [],
  snapshot: {
    matchId: "11111111-1111-4111-8111-111111111111",
    version: 8,
    currentPeriod: 1,
    clockElapsedMs: 600_000,
    competitionElapsedMs: 600_000,
    clockRunning: false,
    clockStartedAt: null,
    homeScore: 5,
    awayScore: 4,
    matchStatus: "live",
    periodDurationMs: 1_800_000,
    serverNow: "2026-08-26T09:00:00.000Z",
  },
};

describe("MatchConsole", () => {
  it("integrates the rule-aware record dock beneath the primary score controls", () => {
    const html = renderToStaticMarkup(<MatchConsole data={data} />);

    expect(html).toContain('aria-label="MATCH CONSOLE"');
    expect(html).toContain('aria-label="試合記録操作"');
    for (const label of ["7m", "警告", "2分", "失格", "TTO", "記録"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("+1 HOME");
    expect(html).toContain("+1 AWAY");
  });
});
