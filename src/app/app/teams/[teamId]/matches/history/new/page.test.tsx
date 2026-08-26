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
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

describe("NewHistoricalMatchResultPage", () => {
  it("renders the manual result form for team admins", async () => {
    getTeamForCurrentUser.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "青山HC",
      role: "admin",
      roster: [],
    });

    const loaded = await import("./page").catch(() => null);
    expect(loaded?.default).toBeTypeOf("function");
    if (!loaded?.default) return;

    const node = await loaded.default({
      params: Promise.resolve({ teamId: "11111111-1111-4111-8111-111111111111" }),
      searchParams: Promise.resolve({ error: "入力を確認してください。" }),
    });
    const html = renderToStaticMarkup(node);

    expect(html).toContain("過去の結果を登録");
    expect(html).toContain("入力を確認してください。");
    expect(html).toContain('/app/teams/11111111-1111-4111-8111-111111111111/matches');
  });

  it("does not expose manual result entry to non-admin team members", async () => {
    getTeamForCurrentUser.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "青山HC",
      role: "member",
      roster: [],
    });

    const loaded = await import("./page").catch(() => null);
    expect(loaded?.default).toBeTypeOf("function");
    if (!loaded?.default) return;

    await expect(
      loaded.default({
        params: Promise.resolve({ teamId: "11111111-1111-4111-8111-111111111111" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("not-found");
  });
});
