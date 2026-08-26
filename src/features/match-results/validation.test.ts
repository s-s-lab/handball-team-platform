import { describe, expect, it } from "vitest";
import { parseManualMatchResultForm } from "./validation";

const TEAM_ID = "11111111-1111-4111-8111-111111111111";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const values = {
    teamId: TEAM_ID,
    name: "秋季リーグ 第2節",
    competitionName: "関東学生リーグ",
    opponentName: "横浜HC",
    teamSide: "home",
    scheduledAt: "2026-08-20T18:30",
    venue: "横浜体育館",
    memo: "過去記録から入力",
    teamScore: "31",
    opponentScore: "28",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  data.set("isPublic", "on");
  return data;
}

describe("parseManualMatchResultForm", () => {
  it("parses a completed result and converts Japan local time to ISO", () => {
    const result = parseManualMatchResultForm(form());
    expect(result).toEqual({
      ok: true,
      value: {
        teamId: TEAM_ID,
        name: "秋季リーグ 第2節",
        competitionName: "関東学生リーグ",
        opponentName: "横浜HC",
        teamSide: "home",
        scheduledAt: "2026-08-20T09:30:00.000Z",
        venue: "横浜体育館",
        memo: "過去記録から入力",
        isPublic: true,
        teamScore: 31,
        opponentScore: 28,
      },
    });
  });

  it("rejects missing opponent and invalid side", () => {
    expect(parseManualMatchResultForm(form({ opponentName: "" }))).toEqual({
      ok: false,
      message: "対戦相手を入力してください。",
    });
    expect(parseManualMatchResultForm(form({ teamSide: "neutral" }))).toEqual({
      ok: false,
      message: "HOMEまたはAWAYを選択してください。",
    });
  });

  it("rejects scores outside 0 to 199", () => {
    expect(parseManualMatchResultForm(form({ teamScore: "200" }))).toEqual({
      ok: false,
      message: "自チーム得点は0〜199で入力してください。",
    });
    expect(parseManualMatchResultForm(form({ opponentScore: "-1" }))).toEqual({
      ok: false,
      message: "相手得点は整数で入力してください。",
    });
  });
});
