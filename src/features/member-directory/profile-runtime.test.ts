import { describe, expect, it } from "vitest";
import type { TeamMemberRecord } from "@/features/team-core/types";

const member: TeamMemberRecord = {
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
};

describe("member profile appearance shaping", () => {
  it("joins roster snapshots to matches and orders the newest appearance first", async () => {
    const runtime = await import("./profile-runtime").catch(() => null);
    expect(runtime?.buildMemberAppearances).toBeTypeOf("function");
    if (!runtime?.buildMemberAppearances) return;

    const appearances = runtime.buildMemberAppearances({
      member,
      rosterRows: [
        { matchId: "old", shirtNumberSnapshot: 14, primaryPositionSnapshot: "RB" },
        { matchId: "new", shirtNumberSnapshot: 4, primaryPositionSnapshot: "CB" },
      ],
      matches: [
        { id: "old", name: "春季リーグ", opponentName: "横浜HC", scheduledAt: "2026-05-01T09:00:00.000Z", venue: "体育館A", status: "finished" },
        { id: "new", name: "秋季リーグ", opponentName: "東京HC", scheduledAt: "2026-08-25T09:00:00.000Z", venue: "体育館B", status: "finished" },
      ],
    });

    expect(appearances.map((appearance) => appearance.matchId)).toEqual(["new", "old"]);
    expect(appearances[0]).toMatchObject({ shirtNumber: 4, primaryPosition: "CB", opponentName: "東京HC" });
  });

  it("falls back to the current roster values when an old snapshot field is empty", async () => {
    const runtime = await import("./profile-runtime").catch(() => null);
    expect(runtime?.buildMemberAppearances).toBeTypeOf("function");
    if (!runtime?.buildMemberAppearances) return;

    const [appearance] = runtime.buildMemberAppearances({
      member,
      rosterRows: [{ matchId: "match-1", shirtNumberSnapshot: null, primaryPositionSnapshot: null }],
      matches: [
        { id: "match-1", name: "練習試合", opponentName: "千葉HC", scheduledAt: "2026-08-01T09:00:00.000Z", venue: null, status: "finished" },
      ],
    });

    expect(appearance?.shirtNumber).toBe(4);
    expect(appearance?.primaryPosition).toBe("CB");
  });
});
