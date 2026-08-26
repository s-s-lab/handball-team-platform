"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { MobileTeamNav } from "./mobile-team-nav";
import { TeamRail } from "./team-rail";
import { TeamSidebar } from "./team-sidebar";
import {
  getWorkspaceNav,
  isMatchOperationRoute,
  resolveWorkspaceTeamId,
  type WorkspaceTeam,
} from "./workspace-nav";

type TeamWorkspaceShellProps = {
  teams: WorkspaceTeam[];
  children: React.ReactNode;
};

function LightweightAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--workspace-surface)]">
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Brand href="/app" />
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">公開ページ</span>
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

export function TeamWorkspaceShell({ teams, children }: TeamWorkspaceShellProps) {
  const pathname = usePathname() ?? "/app";

  if (isMatchOperationRoute(pathname)) {
    return <div className="min-h-screen bg-[var(--workspace-surface)]">{children}</div>;
  }

  const teamId = resolveWorkspaceTeamId(pathname);
  const team = teamId ? teams.find((candidate) => candidate.id === teamId) ?? null : null;

  if (!team) return <LightweightAppShell>{children}</LightweightAppShell>;

  const items = getWorkspaceNav(team.id);

  return (
    <div data-team-workspace-shell className="min-h-screen bg-[var(--workspace-surface)]">
      <TeamSidebar team={team} items={items} pathname={pathname} />
      <TeamRail team={team} items={items} pathname={pathname} />

      <div className="min-h-screen md:pl-20 lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--workspace-accent)]">
                Team workspace
              </p>
              <p className="truncate text-sm font-bold text-foreground">{team.name}</p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-4" aria-hidden="true" /> 公開ページ
              </Link>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="size-4" aria-hidden="true" /> ログアウト
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:py-8">{children}</main>
      </div>

      <MobileTeamNav items={items} pathname={pathname} />
    </div>
  );
}
