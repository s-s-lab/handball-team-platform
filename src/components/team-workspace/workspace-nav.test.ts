import { describe, expect, it } from "vitest";

describe("team workspace navigation", () => {
  it("builds team-scoped navigation for all primary workspace sections", async () => {
    const module = await import("./workspace-nav").catch(() => null);

    expect(module).not.toBeNull();
    if (!module) return;

    expect(module.getWorkspaceNav("team-1").map((item) => item.href)).toEqual([
      "/app/teams/team-1",
      "/app/teams/team-1/schedule",
      "/app/teams/team-1/matches",
      "/app/teams/team-1/members",
      "/app/teams/team-1/stats",
      "/app/teams/team-1/settings",
    ]);
  });

  it("treats team home as exact-only while child sections use prefix matching", async () => {
    const module = await import("./workspace-nav").catch(() => null);

    expect(module).not.toBeNull();
    if (!module) return;

    expect(module.isWorkspaceNavActive("/app/teams/team-1", "/app/teams/team-1")).toBe(true);
    expect(module.isWorkspaceNavActive("/app/teams/team-1/matches/abc", "/app/teams/team-1/matches")).toBe(true);
    expect(module.isWorkspaceNavActive("/app/teams/team-1/members", "/app/teams/team-1")).toBe(false);
  });
});
