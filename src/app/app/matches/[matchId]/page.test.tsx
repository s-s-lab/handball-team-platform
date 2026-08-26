import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  };
});

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/features/matches/data", () => ({
  getMatchForCurrentUser: async () => ({
    id: "11111111-1111-4111-8111-111111111111",
    teamId: "22222222-2222-4222-8222-222222222222",
    name: "記録確認試合",
    opponentName: "相手チーム",
    teamSide: "home",
    scheduledAt: "2026-08-26T09:00:00.000Z",
    venue: "体育館",
    memo: null,
    isPublic: false,
    isLive: false,
    status: "finished",
    rosterConfiguredAt: "2026-08-26T08:00:00.000Z",
    rules: {
      periodCount: 2,
      periodSeconds: 1800,
      halftimeSeconds: 600,
      overtimeEnabled: true,
      overtimePeriodCount: 2,
      overtimePeriodSeconds: 300,
      teamTimeoutsPerGame: 3,
      teamTimeoutsPerPeriod: 2,
      teamTimeoutSeconds: 60,
    },
    roster: [],
  }),
}));

vi.mock("@/features/match-records/data", () => ({
  listMatchRecordEvents: async () => [
    {
      id: "33333333-3333-4333-8333-333333333333",
      matchId: "11111111-1111-4111-8111-111111111111",
      stateVersion: 1,
      eventType: "goal",
      relatedEventId: null,
      period: 1,
      periodElapsedMs: 545000,
      competitionElapsedMs: 545000,
      subjectSide: "home",
      subjectTeamMemberId: null,
      subjectMatchRosterId: null,
      payload: { shirt_number: 7, display_name: "鈴木" },
      createdAt: "2026-08-26T09:00:00.000Z",
    },
  ],
}));

import MatchPage from "./page";

describe("Match detail record integration", () => {
  it("renders the private post-match summary and timeline", async () => {
    const element = await MatchPage({
      params: Promise.resolve({ matchId: "11111111-1111-4111-8111-111111111111" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("試合記録");
    expect(html).toContain("選手別サマリー");
    expect(html).toContain("タイムライン");
    expect(html).toContain("#7 鈴木");
    expect(html).toContain("前半 09:05");
  });
});
