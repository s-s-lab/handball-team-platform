import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { cn } from "@/lib/utils";
import {
  isWorkspaceNavActive,
  type WorkspaceNavItem,
  type WorkspaceTeam,
} from "./workspace-nav";

type TeamSidebarProps = {
  team: WorkspaceTeam;
  items: WorkspaceNavItem[];
  pathname: string;
};

export function TeamSidebar({ team, items, pathname }: TeamSidebarProps) {
  return (
    <aside
      data-workspace-sidebar
      className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-[var(--workspace-ink)] text-white lg:flex"
    >
      <div className="border-b border-white/10 px-5 py-5">
        <Brand href="/app" className="text-white" />
      </div>

      <div className="px-4 pt-5">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--workspace-accent)] text-base font-black text-white shadow-sm">
            {team.name.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{team.name}</p>
            <p className="mt-0.5 truncate text-xs text-white/50">/{team.slug}</p>
          </div>
        </div>
      </div>

      <nav aria-label="チームワークスペース" className="mt-5 flex-1 px-4">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
          Team workspace
        </p>
        <div className="space-y-1.5">
          {items.map((item) => {
            const active = isWorkspaceNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-white text-[var(--workspace-ink)] shadow-sm"
                    : "text-white/65 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          公開ページ
        </Link>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden="true" />
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  );
}
