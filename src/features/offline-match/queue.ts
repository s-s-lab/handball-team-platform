import type {
  OfflineQueueBuildInput,
  OfflineQueueItem,
  OfflineReplayState,
} from "./types";

export type BuildQueueItemResult =
  | { ok: true; item: OfflineQueueItem }
  | { ok: false; message: string };

export function buildQueueItem(
  input: OfflineQueueBuildInput,
  existing: OfflineQueueItem[],
): BuildQueueItemResult {
  if (existing.some((item) => item.clientActionId === input.clientActionId)) {
    return { ok: false, message: "この操作はすでに未同期キューに保存されています。" };
  }

  const localSequence = existing.reduce(
    (max, item) => Math.max(max, item.localSequence),
    0,
  ) + 1;

  return {
    ok: true,
    item: {
      clientActionId: input.clientActionId,
      matchId: input.matchId,
      localSequence,
      action: input.action,
      payload: { ...input.payload },
      baseServerVersion: input.baseServerVersion,
      eventTime: { ...input.eventTime },
      enqueuedAt: input.enqueuedAt,
      syncState: "pending",
    },
  };
}

export function pendingActionsForMatch(
  items: OfflineQueueItem[],
  matchId: string,
): OfflineQueueItem[] {
  return items
    .filter((item) => item.matchId === matchId)
    .sort((a, b) => a.localSequence - b.localSequence);
}

export function detectReplayState(
  serverVersion: number,
  queue: OfflineQueueItem[],
): OfflineReplayState {
  if (!queue.length) return "empty";
  const first = [...queue].sort((a, b) => a.localSequence - b.localSequence)[0];
  return first?.baseServerVersion === serverVersion ? "ready" : "conflict";
}
