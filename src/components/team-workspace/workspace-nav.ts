import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  House,
  Settings,
  Swords,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type WorkspaceNavItem = {
  label: "ホーム" | "スケジュール" | "試合" | "メンバー" | "成績" | "設定";
  href: string;
  icon: LucideIcon;
  mobilePrimary: boolean;
};

export type WorkspaceTeam = {
  id: string;
  name: string;
  slug: string;
};

export function getWorkspaceNav(teamId: string): WorkspaceNavItem[] {
  const base = `/app/teams/${teamId}`;

  return [
    { label: "ホーム", href: base, icon: House, mobilePrimary: true },
    { label: "スケジュール", href: `${base}/schedule`, icon: CalendarDays, mobilePrimary: true },
    { label: "試合", href: `${base}/matches`, icon: Swords, mobilePrimary: true },
    { label: "メンバー", href: `${base}/members`, icon: UsersRound, mobilePrimary: true },
    { label: "成績", href: `${base}/stats`, icon: ChartNoAxesColumnIncreasing, mobilePrimary: false },
    { label: "設定", href: `${base}/settings`, icon: Settings, mobilePrimary: false },
  ];
}

function normalizePath(value: string) {
  if (value === "/") return value;
  return value.replace(/\/+$/, "");
}

export function isWorkspaceNavActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);

  if (current === target) return true;

  const segments = target.split("/").filter(Boolean);
  const isTeamHome = segments.length === 3 && segments[0] === "app" && segments[1] === "teams";
  if (isTeamHome) return false;

  return current.startsWith(`${target}/`);
}

export function resolveWorkspaceTeamId(pathname: string): string | null {
  const match = pathname.match(/^\/app\/teams\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

export function isMatchOperationRoute(pathname: string): boolean {
  return /^\/app\/matches\/[^/]+(?:\/|$)/.test(pathname);
}
