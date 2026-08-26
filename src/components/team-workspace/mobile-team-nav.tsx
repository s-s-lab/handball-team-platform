import Link from "next/link";
import { ExternalLink, LogOut, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { isWorkspaceNavActive, type WorkspaceNavItem } from "./workspace-nav";

type MobileTeamNavProps = {
  items: WorkspaceNavItem[];
  pathname: string;
};

export function MobileTeamNav({ items, pathname }: MobileTeamNavProps) {
  const primaryItems = items.filter((item) => item.mobilePrimary);
  const secondaryItems = items.filter((item) => !item.mobilePrimary);

  return (
    <nav
      data-workspace-mobile-nav
      aria-label="モバイルチームナビゲーション"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {primaryItems.map((item) => {
          const active = isWorkspaceNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-13 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition-colors",
                active
                  ? "bg-[color-mix(in_oklch,var(--workspace-accent)_12%,white)] text-[var(--workspace-accent)]"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <details className="group relative">
          <summary className="flex min-h-13 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="size-5" aria-hidden="true" />
            <span>その他</span>
          </summary>
          <div className="absolute right-0 bottom-full mb-3 w-56 rounded-2xl border border-border bg-white p-2 shadow-xl">
            {secondaryItems.map((item) => {
              const active = isWorkspaceNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" /> {item.label}
                </Link>
              );
            })}
            <div className="my-1 border-t border-border" />
            <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
              <ExternalLink className="size-4" aria-hidden="true" /> 公開ページ
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-muted">
                <LogOut className="size-4" aria-hidden="true" /> ログアウト
              </button>
            </form>
          </div>
        </details>
      </div>
    </nav>
  );
}
