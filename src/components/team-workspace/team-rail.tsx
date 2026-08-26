import Link from "next/link";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isWorkspaceNavActive,
  type WorkspaceNavItem,
  type WorkspaceTeam,
} from "./workspace-nav";

type TeamRailProps = {
  team: WorkspaceTeam;
  items: WorkspaceNavItem[];
  pathname: string;
};

export function TeamRail({ team, items, pathname }: TeamRailProps) {
  return (
    <aside
      data-workspace-tablet-rail
      className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r border-white/10 bg-[var(--workspace-ink)] px-2 py-4 text-white md:flex lg:hidden"
    >
      <Link
        href="/app"
        aria-label="アプリホーム"
        className="grid size-11 place-items-center rounded-xl bg-[var(--workspace-accent)] text-xs font-black tracking-wider text-white"
      >
        HB
      </Link>

      <div className="mt-5 grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-sm font-black">
        {team.name.slice(0, 1)}
      </div>

      <nav aria-label="チームワークスペース" className="mt-5 flex w-full flex-1 flex-col items-center gap-2">
        {items.map((item) => {
          const active = isWorkspaceNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "grid size-12 place-items-center rounded-xl transition-colors",
                active
                  ? "bg-white text-[var(--workspace-ink)] shadow-sm"
                  : "text-white/55 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <details className="group relative w-full">
        <summary className="grid min-h-12 cursor-pointer list-none place-items-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white [&::-webkit-details-marker]:hidden">
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">メニューを開く</span>
        </summary>
        <div className="absolute bottom-0 left-14 w-56 rounded-2xl border border-border bg-white p-2 text-foreground shadow-xl">
          <p className="px-3 py-2 text-xs font-bold text-muted-foreground">{team.name}</p>
          <Link href="/" className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted">
            <ExternalLink className="size-4" aria-hidden="true" /> 公開ページ
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-semibold hover:bg-muted">
              <LogOut className="size-4" aria-hidden="true" /> ログアウト
            </button>
          </form>
        </div>
      </details>
    </aside>
  );
}
