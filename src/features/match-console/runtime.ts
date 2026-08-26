export type ConsolePeriodRules = {
  periodCount: number;
  periodSeconds: number;
  overtimeEnabled: boolean;
  overtimePeriodCount: number;
  overtimePeriodSeconds: number;
};

export type ConsoleRuntimeSnapshot = {
  currentPeriod: number;
  clockElapsedMs: number;
  clockRunning: boolean;
  clockStartedAt: string | null;
  rules: ConsolePeriodRules;
};

export function periodDurationMs(snapshot: ConsoleRuntimeSnapshot) {
  const isOvertime = snapshot.currentPeriod > snapshot.rules.periodCount;
  const seconds = isOvertime
    ? snapshot.rules.overtimePeriodSeconds
    : snapshot.rules.periodSeconds;
  return Math.max(0, seconds * 1000);
}

export function effectiveElapsedMs(snapshot: ConsoleRuntimeSnapshot, serverNowMs: number) {
  const persisted = Math.max(0, snapshot.clockElapsedMs);
  if (!snapshot.clockRunning || !snapshot.clockStartedAt) {
    return Math.min(persisted, periodDurationMs(snapshot));
  }

  const anchorMs = Date.parse(snapshot.clockStartedAt);
  const delta = Number.isFinite(anchorMs) ? Math.max(0, serverNowMs - anchorMs) : 0;
  return Math.min(persisted + delta, periodDurationMs(snapshot));
}

export function formatClock(elapsedMs: number) {
  const totalSeconds = Math.floor(Math.max(0, elapsedMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
