import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MemberProfileData } from "@/features/member-directory/data";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

const profile = {
  team: { id: "team-1", name: "青山ハンドボールクラブ", slug: "agu" },
  role: "admin",
  member: {
    id: "p4",
    teamId: "team-1",
    kind: "player",
    fullName: "鈴木 太郎",
    displayName: "Taro",
    shirtNumber: 4,
    primaryPosition: "CB",
    gradeOrAge: "U18",
    imagePath: null,
    isActive: true,
    isPublic: false,
  },
  appearances: [
    {
      matchId: "match-1",
      matchName: "秋季リーグ",
      opponentName: "東京HC",
      scheduledAt: "2026-08-25T09:00:00.000Z",
      venue: "青山体育館",
      status: "finished",
      shirtNumber: 4,
      primaryPosition: "CB",
    },
  ],
  seasonStats: [
    {
      seasonId: "season-2026",
      seasonName: "2026",
      isCurrent: true,
      appearances: 8,
      starts: 7,
      goals: 42,
      sevenMeterGoals: 5,
      sevenMeterAttempts: 6,
      warnings: 1,
      twoMinuteSuspensions: 2,
      disqualifications: 0,
      saves: 0,
      shotsFaced: 0,
    },
  ],
} satisfies MemberProfileData;

describe("MemberProfile", () => {
  it("renders member identity, season stats and recent appearances", async () => {
    const loaded = await import("./member-profile").catch(() => null);
    expect(loaded?.MemberProfile).toBeTypeOf("function");
    if (!loaded?.MemberProfile) return;

    const html = renderToStaticMarkup(loaded.MemberProfile({ profile }));
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("鈴木 太郎");
    expect(text).toContain("4");
    expect(text).toContain("CB");
    expect(text).toContain("U18");
    expect(text).toContain("シーズン成績");
    expect(text).toContain("2026");
    expect(text).toContain("42");
    expect(text).toContain("5.25");
    expect(text).not.toContain("準備中");
    expect(text).toContain("最近の試合");
    expect(text).toContain("東京HC");
    expect(text).toContain("秋季リーグ");
    expect(html).toContain('/app/teams/team-1/members');
    expect(html).toContain('/app/teams/team-1/members/p4/edit');
    expect(html).toContain('/app/matches/match-1');
  });
});
