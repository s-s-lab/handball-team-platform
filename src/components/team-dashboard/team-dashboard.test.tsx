import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("TeamDashboard", () => {
  it("renders the operational overview and working quick actions", async () => {
    const dashboardModule = await import("./team-dashboard").catch(() => null);

    expect(dashboardModule?.TeamDashboard).toBeTypeOf("function");
    if (!dashboardModule?.TeamDashboard) return;

    const html = renderToStaticMarkup(
      dashboardModule.TeamDashboard({
        team: {
          id: "team-1",
          name: "青山ハンドボールクラブ",
          shortName: "AGU",
          slug: "agu-handball",
          description: "Team description",
          isPublic: true,
        },
        isAdmin: true,
        summary: {
          nextMatch: {
            id: "match-next",
            name: "関東リーグ",
            opponentName: "東京HC",
            teamSide: "home",
            scheduledAt: "2026-08-29T09:00:00.000Z",
            venue: "青山記念館",
            status: "scheduled",
            homeScore: 0,
            awayScore: 0,
          },
          latestResult: {
            id: "match-last",
            name: "関東リーグ",
            opponentName: "横浜HC",
            teamSide: "away",
            scheduledAt: "2026-08-25T09:00:00.000Z",
            venue: "横浜体育館",
            status: "finished",
            homeScore: 24,
            awayScore: 28,
          },
          record: { played: 6, wins: 4, draws: 1, losses: 1 },
          activeMemberCount: 18,
          topScorers: [
            { teamMemberId: "p1", displayName: "鈴木", shirtNumber: 4, goals: 31 },
            { teamMemberId: "p2", displayName: "佐藤", shirtNumber: 9, goals: 24 },
          ],
        },
      }),
    );
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("青山ハンドボールクラブ");
    expect(text).toContain("次の試合");
    expect(text).toContain("直近の結果");
    expect(text).toContain("4勝");
    expect(text).toContain("18");
    expect(text).toContain("得点ランキング");
    expect(text).toContain("31");
    expect(html).toContain(`/app/teams/team-1/matches/new`);
    expect(html).toContain(`/app/teams/team-1/members/new`);
  });
});
