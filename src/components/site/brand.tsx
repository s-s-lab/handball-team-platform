import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3 font-bold tracking-tight", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-xs font-black tracking-wider text-primary-foreground">HB</span>
      <span>Handball Team Platform</span>
    </Link>
  );
}
