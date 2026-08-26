import type { OfflineQueueItem } from "./types";

export type ReplayStep = {
  item: OfflineQueueItem;
  expectedVersion: number;
};

export type ReplayPlan =
  | { state: "empty" }
  | { state: "conflict"; serverVersion: number; baseServerVersion: number }
  | { state: "ready"; steps: ReplayStep[] };

export function buildReplayPlan(
  serverVersion: number,
  queue: OfflineQueueItem[],
): ReplayPlan {
  if (!queue.length) return { state: "empty" };

  const ordered = [...queue].sort((a, b) => a.localSequence - b.localSequence);
  const first = ordered[0];
  if (!first) return { state: "empty" };

  if (first.baseServerVersion !== serverVersion) {
    return {
      state: "conflict",
      serverVersion,
      baseServerVersion: first.baseServerVersion,
    };
  }

  return {
    state: "ready",
    steps: ordered.map((item, index) => ({
      item,
      expectedVersion: serverVersion + index,
    })),
  };
}

export function advanceReplayQueue(
  queue: OfflineQueueItem[],
  clientActionId: string,
  outcome: "accepted" | "failed",
): OfflineQueueItem[] {
  const ordered = [...queue].sort((a, b) => a.localSequence - b.localSequence);
  if (outcome === "accepted") {
    return ordered.filter((item) => item.clientActionId !== clientActionId);
  }

  return ordered.map((item) =>
    item.clientActionId === clientActionId
      ? { ...item, syncState: "failed" as const }
      : item,
  );
}

export function rebaseReplayQueue(
  queue: OfflineQueueItem[],
  baseServerVersion: number,
): OfflineQueueItem[] {
  return [...queue]
    .sort((a, b) => a.localSequence - b.localSequence)
    .map((item) => ({
      ...item,
      baseServerVersion,
      syncState: item.syncState === "failed" ? "failed" as const : "pending" as const,
    }));
}
