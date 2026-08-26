import { describe, expect, it } from "vitest";

describe("team workspace navigation", () => {
  it("builds team-scoped navigation for all primary workspace sections", async () => {
    const workspaceNav = await import("./workspace-nav").catch(() => null);

    expect(workspaceNav).not.toBeNull();
    if (!workspaceNav) return;

    expect(workspaceNav.getWorkspaceNav("team-1").map((item) => item.href)).toEqual([
      "/app/teams/team-1",
      "/app/teams/team-1/schedule",
      "/app/teams/team-1/matches",
      "/app/teams/team-1/members",
      "/app/teams/team-1/stats",
      "/app/teams/team-1/settings",
    ]);
  });

  it("treats team home as exact-only while child sections use prefix matching", async () => {
    const workspaceNav = await import("./workspace-nav").catch(() => null);

    expect(workspaceNav).not.toBeNull();
    if (!workspaceNav) return;

    expect(workspaceNav.isWorkspaceNavActive("/app/teams/team-1", "/app/teams/team-1")).toBe(true);
    expect(
      workspaceNav.isWorkspaceNavActive(
        "/app/teams/team-1/matches/abc",
        "/app/teams/team-1/matches",
      ),
    ).toBe(true);
    expect(
      workspaceNav.isWorkspaceNavActive("/app/teams/team-1/members", "/app/teams/team-1"),
    ).toBe(false);
  });

  it("resolves team workspace routes without treating the operational match console as a team route", async () => {
    const workspaceNav = await import("./workspace-nav").catch(() => null);

    expect(workspaceNav?.resolveWorkspaceTeamId).toBeTypeOf("function");
    expect(workspaceNav?.isMatchOperationRoute).toBeTypeOf("function");
    if (!workspaceNav?.resolveWorkspaceTeamId || !workspaceNav?.isMatchOperationRoute) return;

    expect(workspaceNav.resolveWorkspaceTeamId("/app/teams/team-1/stats")).toBe("team-1");
    expect(workspaceNav.resolveWorkspaceTeamId("/app")).toBeNull();
    expect(workspaceNav.resolveWorkspaceTeamId("/app/matches/match-1")).toBeNull();
    expect(workspaceNav.isMatchOperationRoute("/app/matches/match-1")).toBe(true);
    expect(workspaceNav.isMatchOperationRoute("/app/teams/team-1/matches")).toBe(false);
  });
});
