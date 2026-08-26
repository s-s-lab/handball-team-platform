import type { ConsoleSnapshot } from "@/features/match-console/types";
import { formatClock } from "@/features/match-console/runtime";
import { Button } from "@/components/ui/button";

function SnapshotBox({
  label,
  snapshot,
}: {
  label: string;
  snapshot: ConsoleSnapshot;
}) {
  return (
    <div className="rounded-xl border border-amber-300/40 bg-black/10 p-3">
      <p className="text-xs font-black tracking-wide text-amber-100">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-primary-foreground/60">SCORE</p>
          <p className="mt-1 font-black tabular-nums">
            {snapshot.homeScore} - {snapshot.awayScore}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-primary-foreground/60">PERIOD</p>
          <p className="mt-1 font-black">{snapshot.currentPeriod}</p>
        </div>
        <div>
          <p className="text-[11px] text-primary-foreground/60">CLOCK</p>
          <p className="mt-1 font-mono font-black tabular-nums">{formatClock(snapshot.clockElapsedMs)}</p>
        </div>
      </div>
    </div>
  );
}

export function ConflictPanel({
  serverSnapshot,
  localSnapshot,
  pendingCount,
  onDiscardLocal,
}: {
  serverSnapshot: ConsoleSnapshot;
  localSnapshot: ConsoleSnapshot;
  pendingCount: number;
  onDiscardLocal: () => void;
}) {
  return (
    <section
      aria-label="オフライン同期の競合"
      className="rounded-2xl border border-amber-300/60 bg-amber-400/10 p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-black text-amber-100">競合あり</p>
        <p className="text-xs leading-5 text-primary-foreground/70">
          別の端末で試合状態が進んでいるため、自動同期を停止しました。{pendingCount}件の未同期操作があります。
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <SnapshotBox label="サーバー" snapshot={serverSnapshot} />
        <SnapshotBox label="ローカル" snapshot={localSnapshot} />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="mt-4 min-h-12 w-full"
        onClick={onDiscardLocal}
      >
        ローカル未同期を破棄してサーバー状態へ戻る
      </Button>
    </section>
  );
}
