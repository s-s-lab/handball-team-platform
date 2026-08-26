import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PublicPortalMatch } from "@/features/public-portal/types";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  };
});

import { PortalMatchSections } from "./portal-match-sections";

const base: PublicPortalMatch = {
  matchId: "66000000-0000-4000-8000-000000000021",
  matchName: "League Match",
  teamId: "66000000-0000-4000-8000-000000000022",
  teamName: "Blue Handball",
  teamSlug: "blue-handball",
  teamShortName: "BLUE",
  opponentName: "Red Handball",
  teamSide: "home",
  scheduledAt: "2026-08-26T10:00:00+00:00",
  venue: "Main Gym",
  status: "live",
  homeScore: 8,
  awayScore: 7,
};

describe("PortalMatchSections", () => {
  it("renders live, upcoming and recent results with separate destination links", () => {
    const matches: PublicPortalMatch[] = [
      base,
      {
        ...base,
        matchId: "66000000-0000-4000-8000-000000000023",
        status: "scheduled",
      },
      {
        ...base,
        matchId: "66000000-0000-4000-8000-000000000024",
        status: "finished",
        homeScore: 20,
        awayScore: 18,
      },
    ];

    const html = renderToStaticMarkup(<PortalMatchSections matches={matches} />);

    expect(html).toContain("LIVE");
    expect(html).toContain("今後の試合");
    expect(html).toContain("最近の結果");
    expect(html).toContain('href="/teams/blue-handball"');
    expect(html).toContain('href="/live/66000000-0000-4000-8000-000000000021"');
    expect(html).toContain("8");
    expect(html).toContain("7");
  });

  it("shows neutral empty states for all three sections", () => {
    const html = renderToStaticMarkup(<PortalMatchSections matches={[]} />);

    expect(html).toContain("現在LIVE公開中の試合はありません。");
    expect(html).toContain("現在公開されている今後の試合はありません。");
    expect(html).toContain("最近公開された試合結果はありません。");
  });
});
