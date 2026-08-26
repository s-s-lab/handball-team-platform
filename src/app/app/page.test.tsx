import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { listMyOrganizations, listMyTeams } = vi.hoisted(() => ({
  listMyOrganizations: vi.fn(),
  listMyTeams: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("@/features/team-core/data", () => ({
  listMyOrganizations,
  listMyTeams,
}));

import AppHomePage from "./page";

describe("AppHomePage", () => {
  it("presents direct teams as the primary workspace entry and organizations as secondary", async () => {
    listMyOrganizations.mockResolvedValue([
      { id: "org-1", name: "青山学院", role: "admin" },
    ]);
    listMyTeams.mockResolvedValue([
      {
        id: "team-1",
        name: "青山ハンドボールクラブ",
        slug: "aoyama-handball",
        role: "admin",
        isPublic: true,
      },
    ]);

    const html = renderToStaticMarkup(await AppHomePage());

    expect(html).toContain("チームを選ぶ");
    expect(html).toContain("あなたのチーム");
    expect(html).toContain("青山ハンドボールクラブ");
    expect(html).toContain('href="/app/teams/team-1"');
    expect(html).toContain("所属組織");
    expect(html).toContain("新しい組織を作る");
  });
});
