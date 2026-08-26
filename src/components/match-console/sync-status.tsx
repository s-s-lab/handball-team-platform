export type MatchConsoleSyncStatus =
  | "saved"
  | "saving"
  | "syncing"
  | "offline"
  | "conflict";

function label(status: MatchConsoleSyncStatus, pendingCount: number) {
  switch (status) {
    case "saving":
      return "保存中";
    case "syncing":
      return pendingCount > 0 ? `同期中・${pendingCount}件` : "同期中";
    case "offline":
      return `オフライン・${pendingCount}件未同期`;
    case "conflict":
      return "競合あり";
    case "saved":
    default:
      return "保存済み";
  }
}

export function SyncStatus({
  status,
  pendingCount,
}: {
  status: MatchConsoleSyncStatus;
  pendingCount: number;
}) {
  const emphasized = status === "offline" || status === "conflict";

  return (
    <span
      aria-label="同期状態"
      role="status"
      className={
        emphasized
          ? "rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950"
          : "rounded-full bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold text-primary-foreground"
      }
    >
      {label(status, pendingCount)}
    </span>
  );
}
