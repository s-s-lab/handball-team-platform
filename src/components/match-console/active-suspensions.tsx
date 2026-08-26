import type { ActiveSuspension } from "@/features/match-records/types";

function formatRemaining(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ActiveSuspensions({ suspensions }: { suspensions: ActiveSuspension[] }) {
  if (suspensions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3" aria-label="退場中の選手">
      <p className="text-xs font-black tracking-[0.14em] text-amber-100/80">退場中</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {suspensions.map((item) => (
          <div key={item.eventId} className="flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {item.shirtNumber !== null ? `#${item.shirtNumber} ` : ""}
                {item.displayName ?? (item.side === "home" ? "HOME" : "AWAY")}
              </p>
              <p className="text-[11px] font-semibold text-primary-foreground/60">
                2分間退場 {item.suspensionCount}回目
                {item.resultingDisqualification ? " · 失格" : ""}
              </p>
            </div>
            <span className="font-mono text-xl font-black tabular-nums text-amber-100">
              {formatRemaining(item.remainingMs)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
