import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScheduleBoard } from "./schedule-board";

describe("ScheduleBoard", () => {
  it("renders filters, month view, mobile agenda and linked match navigation", () => {
    const html = renderToStaticMarkup(
      <ScheduleBoard
        teamId="team-1"
        isAdmin
        year={2026}
        month={8}
        events={[
          {
            id: "event-1",
            teamId: "team-1",
            linkedMatchId: null,
            eventType: "practice",
            title: "通常練習",
            startsAt: "2026-08-27T09:00:00.000Z",
            endsAt: "2026-08-27T11:00:00.000Z",
            venue: "青山記念館",
            memo: null,
            status: "scheduled",
          },
          {
            id: "event-2",
            teamId: "team-1",
            linkedMatchId: "match-2",
            eventType: "official_match",
            title: "関東リーグ vs 東京HC",
            startsAt: "2026-08-29T09:00:00.000Z",
            endsAt: null,
            venue: "代々木体育館",
            memo: null,
            status: "scheduled",
          },
        ]}
      />,
    );
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("スケジュール");
    expect(text).toContain("練習");
    expect(text).toContain("公式戦");
    expect(text).toContain("ミーティング");
    expect(text).toContain("通常練習");
    expect(text).toContain("関東リーグ vs 東京HC");
    expect(html).toContain("/app/teams/team-1/schedule/new");
    expect(html).toContain("/app/matches/match-2");
    expect(html).toContain("md:grid");
    expect(html).toContain("md:hidden");
  });
});
