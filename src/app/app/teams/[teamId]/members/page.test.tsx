import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getTeamForCurrentUser } = vi.hoisted(() => ({
  getTeamForCurrentUser: vi.fn(),
}));

vi.mock("@/features/team-core/data", () => ({ getTeamForCurrentUser }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not-found");
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

describe("TeamMembersPage", () => {
  it("renders the dedicated searchable roster route", async () => {
    getTeamForCurrentUser.mockResolvedValue({
      id: "team-1",
      organizationId: "org-1",
      name: "青山ハンドボールクラブ",
      slug: "agu",
      shortName: "AGU",
      description: null,
      isPublic: false,
      role: "admin",
      roster: [
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
      ],
    });

    const loaded = await import("./page").catch(() => null);
    expect(loaded?.default).toBeTypeOf("function");
    if (!loaded?.default) return;

    const node = await loaded.default({
      params: Promise.resolve({ teamId: "team-1" }),
      searchParams: Promise.resolve({ q: "鈴木", filter: "players" }),
    });
    const html = renderToStaticMarkup(node);

    expect(html).toContain("メンバー");
    expect(html).toContain("鈴木 太郎");
    expect(html).toContain('value="鈴木"');
    expect(html).toContain('href="/app/teams/team-1/members/new"');
  });

  it("keeps the team home focused on summaries instead of embedding the full roster", () => {
    const teamHomeSource = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
    expect(teamHomeSource).not.toContain("RosterList");
    expect(teamHomeSource).toContain("TeamDashboard");
  });
});
