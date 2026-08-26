import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 text-foreground", className)}>
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--workspace-accent)] text-[11px] font-black tracking-[0.16em] text-white shadow-sm">
        HB
        <span
          className="absolute inset-x-1 bottom-1 h-1 rounded-full bg-[var(--workspace-highlight)]"
          aria-hidden="true"
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[13px] font-black tracking-[0.06em]">HANDBALL</span>
        <span className="mt-1 text-[9px] font-bold tracking-[0.18em] text-current opacity-45">
          TEAM WORKSPACE
        </span>
      </span>
    </Link>
  );
}
