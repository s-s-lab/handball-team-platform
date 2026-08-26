import { describe, expect, it } from "vitest";
import type { TeamMemberRecord } from "@/features/team-core/types";

const roster: TeamMemberRecord[] = [
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
  {
    id: "inactive",
    teamId: "team-1",
    kind: "player",
    fullName: "田中 次郎",
    displayName: null,
    shirtNumber: 2,
    primaryPosition: "RW",
    gradeOrAge: "OB",
    imagePath: null,
    isActive: false,
    isPublic: false,
  },
];

describe("member directory runtime", () => {
  it("filters by roster category", async () => {
    const runtime = await import("./runtime").catch(() => null);
    expect(runtime?.filterDirectoryMembers).toBeTypeOf("function");
    if (!runtime?.filterDirectoryMembers) return;

    expect(runtime.filterDirectoryMembers(roster, { filter: "players", query: "" }).map((member) => member.id)).toEqual(["p4", "p12"]);
    expect(runtime.filterDirectoryMembers(roster, { filter: "staff", query: "" }).map((member) => member.id)).toEqual(["staff"]);
    expect(runtime.filterDirectoryMembers(roster, { filter: "inactive", query: "" }).map((member) => member.id)).toEqual(["inactive"]);
  });

  it("searches names, number, position and grade case-insensitively", async () => {
    const runtime = await import("./runtime").catch(() => null);
    expect(runtime?.filterDirectoryMembers).toBeTypeOf("function");
    if (!runtime?.filterDirectoryMembers) return;

    expect(runtime.filterDirectoryMembers(roster, { filter: "all", query: "hanako" }).map((member) => member.id)).toEqual(["p12"]);
    expect(runtime.filterDirectoryMembers(roster, { filter: "all", query: "#4" }).map((member) => member.id)).toEqual(["p4"]);
    expect(runtime.filterDirectoryMembers(roster, { filter: "all", query: "gk" }).map((member) => member.id)).toEqual(["p12"]);
    expect(runtime.filterDirectoryMembers(roster, { filter: "all", query: "u18" }).map((member) => member.id)).toEqual(["p4"]);
  });

  it("keeps active players first and sorts them by shirt number", async () => {
    const runtime = await import("./runtime").catch(() => null);
    expect(runtime?.filterDirectoryMembers).toBeTypeOf("function");
    if (!runtime?.filterDirectoryMembers) return;

    expect(runtime.filterDirectoryMembers(roster, { filter: "all", query: "" }).map((member) => member.id)).toEqual([
      "p4",
      "p12",
      "staff",
      "inactive",
    ]);
  });

  it("returns directory counts for navigation labels", async () => {
    const runtime = await import("./runtime").catch(() => null);
    expect(runtime?.memberDirectoryCounts).toBeTypeOf("function");
    if (!runtime?.memberDirectoryCounts) return;

    expect(runtime.memberDirectoryCounts(roster)).toEqual({ all: 4, players: 2, staff: 1, inactive: 1 });
  });
});
