import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { TeamMemberRecord } from "@/features/team-core/types";

const roster: TeamMemberRecord[] = [
  {
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
  {
    id: "p12",
    teamId: "team-1",
    kind: "player",
    fullName: "山田 花子",
    displayName: "HANAKO",
    shirtNumber: 12,
    primaryPosition: "GK",
    gradeOrAge: "高校2年",
    imagePath: null,
    isActive: true,
    isPublic: true,
  },
  {
    id: "staff",
    teamId: "team-1",
    kind: "staff",
    fullName: "佐藤 コーチ",
    displayName: null,
    shirtNumber: null,
    primaryPosition: null,
    gradeOrAge: null,
    imagePath: null,
    isActive: true,
    isPublic: false,
  },
];

describe("MemberDirectory", () => {
  it("renders searchable sports-roster navigation and profile links", async () => {
    const loaded = await import("./member-directory").catch(() => null);
    expect(loaded?.MemberDirectory).toBeTypeOf("function");
    if (!loaded?.MemberDirectory) return;

    const html = renderToStaticMarkup(
      loaded.MemberDirectory({
        teamId: "team-1",
        teamName: "青山ハンドボールクラブ",
        roster,
        isAdmin: true,
        filter: "all",
        query: "",
      }),
    );
    const text = html.replace(/<[^>]+>/g, "");

    expect(text).toContain("メンバー");
    expect(text).toContain("すべて");
    expect(text).toContain("選手");
    expect(text).toContain("スタッフ");
    expect(text).toContain("非在籍");
    expect(text).toContain("鈴木 太郎");
    expect(text).toContain("CB");
    expect(text).toContain("佐藤 コーチ");
    expect(html).toContain('name="q"');
    expect(html).toContain('/app/teams/team-1/members/p4');
    expect(html).toContain('/app/teams/team-1/members/new');
    expect(html).toContain('/app/teams/team-1/members/p4/edit');
  });
});
