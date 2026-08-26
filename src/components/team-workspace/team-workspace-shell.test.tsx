import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({ pathname: "/app/teams/team-1" }));

vi.mock("next/navigation", () => ({
  usePathname: () => routeState.pathname,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

const team = {
  id: "team-1",
  name: "青山ハンドボールクラブ",
  slug: "aoyama-handball",
};

describe("team workspace responsive shell", () => {
  it("renders desktop, tablet and mobile team navigation with active state", async () => {
    const [sidebarModule, railModule, mobileModule, navModule] = await Promise.all([
      import("./team-sidebar").catch(() => null),
      import("./team-rail").catch(() => null),
      import("./mobile-team-nav").catch(() => null),
      import("./workspace-nav").catch(() => null),
    ]);

    expect(sidebarModule).not.toBeNull();
    expect(railModule).not.toBeNull();
    expect(mobileModule).not.toBeNull();
    if (!sidebarModule || !railModule || !mobileModule || !navModule) return;

    const items = navModule.getWorkspaceNav(team.id);
    const sidebarHtml = renderToStaticMarkup(
      <sidebarModule.TeamSidebar team={team} items={items} pathname={routeState.pathname} />,
    );
    const railHtml = renderToStaticMarkup(
      <railModule.TeamRail team={team} items={items} pathname={routeState.pathname} />,
    );
    const mobileHtml = renderToStaticMarkup(
      <mobileModule.MobileTeamNav items={items} pathname={routeState.pathname} />,
    );

    expect(sidebarHtml).toContain("data-workspace-sidebar");
    expect(sidebarHtml).toContain("青山ハンドボールクラブ");
    expect(sidebarHtml).toContain('aria-current="page"');
    expect(sidebarHtml).toContain("スケジュール");
    expect(railHtml).toContain("data-workspace-tablet-rail");
    expect(mobileHtml).toContain("data-workspace-mobile-nav");
    expect(mobileHtml).toContain("その他");
  });

  it("keeps the operational match route outside the team workspace chrome", async () => {
    const shellModule = await import("./team-workspace-shell").catch(() => null);

    expect(shellModule).not.toBeNull();
    if (!shellModule) return;

    routeState.pathname = "/app/matches/match-1";
    const html = renderToStaticMarkup(
      <shellModule.TeamWorkspaceShell teams={[team]}>
        <div>MATCH CONTENT</div>
      </shellModule.TeamWorkspaceShell>,
    );

    expect(html).toContain("MATCH CONTENT");
    expect(html).not.toContain("data-workspace-sidebar");
    expect(html).not.toContain("data-workspace-mobile-nav");
  });

  it("uses team workspace chrome on team routes and a lightweight shell on the app home", async () => {
    const shellModule = await import("./team-workspace-shell").catch(() => null);

    expect(shellModule).not.toBeNull();
    if (!shellModule) return;

    routeState.pathname = "/app/teams/team-1/members";
    const teamHtml = renderToStaticMarkup(
      <shellModule.TeamWorkspaceShell teams={[team]}>
        <div>TEAM CONTENT</div>
      </shellModule.TeamWorkspaceShell>,
    );
    expect(teamHtml).toContain("data-team-workspace-shell");
    expect(teamHtml).toContain("data-workspace-sidebar");

    routeState.pathname = "/app";
    const homeHtml = renderToStaticMarkup(
      <shellModule.TeamWorkspaceShell teams={[team]}>
        <div>APP HOME</div>
      </shellModule.TeamWorkspaceShell>,
    );
    expect(homeHtml).toContain("APP HOME");
    expect(homeHtml).not.toContain("data-workspace-sidebar");
  });
});
