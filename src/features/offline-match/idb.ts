import type {
  ConsoleParticipant,
  ConsoleSnapshot,
} from "@/features/match-console/types";
import type { RecordEvent } from "@/features/match-records/types";
import type {
  OfflineMatchRules,
  OfflineQueueItem,
} from "./types";

export const OFFLINE_DB_NAME = "handball-match-console";
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_DB_STORES = [
  "matchSnapshots",
  "matchEvents",
  "matchParticipants",
  "pendingActions",
] as const;

export type OfflineDbStore = (typeof OFFLINE_DB_STORES)[number];

export type OfflineSnapshotCache = {
  acceptedServerSnapshot: ConsoleSnapshot;
  optimisticSnapshot: ConsoleSnapshot;
  rules: OfflineMatchRules;
  managedSide: "home" | "away";
  nextLocalSequence: number;
};

type StoredValue<T> = {
  key: string;
  matchId: string;
  value: T;
  updatedAt: string;
};

export function matchRecordKey(matchId: string, suffix: string): string {
  return `${matchId}:${suffix}`;
}

function ensureIndexedDb(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("このブラウザではオフライン保存を利用できません。");
  }
  return indexedDB;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = ensureIndexedDb().open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of OFFLINE_DB_STORES) {
        if (db.objectStoreNames.contains(storeName)) continue;
        const store = db.createObjectStore(storeName, { keyPath: "key" });
        store.createIndex("matchId", "matchId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("オフライン保存領域を開けませんでした。"));
    request.onblocked = () => reject(new Error("オフライン保存領域の更新がブロックされています。"));
  });
}

async function putValue<T>(
  storeName: OfflineDbStore,
  key: string,
  matchId: string,
  value: T,
): Promise<void> {
  const db = await openOfflineDb();
  try {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put({
      key,
      matchId,
      value,
      updatedAt: new Date().toISOString(),
    } satisfies StoredValue<T>);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

async function getValue<T>(storeName: OfflineDbStore, key: string): Promise<T | null> {
  const db = await openOfflineDb();
  try {
    const transaction = db.transaction(storeName, "readonly");
    const stored = await requestToPromise(
      transaction.objectStore(storeName).get(key) as IDBRequest<StoredValue<T> | undefined>,
    );
    await transactionDone(transaction);
    return stored?.value ?? null;
  } finally {
    db.close();
  }
}

async function deleteValue(storeName: OfflineDbStore, key: string): Promise<void> {
  const db = await openOfflineDb();
  try {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export function saveOfflineSnapshot(matchId: string, value: OfflineSnapshotCache): Promise<void> {
  return putValue("matchSnapshots", matchRecordKey(matchId, "snapshot"), matchId, value);
}

export function loadOfflineSnapshot(matchId: string): Promise<OfflineSnapshotCache | null> {
  return getValue("matchSnapshots", matchRecordKey(matchId, "snapshot"));
}

export function saveOfflineEvents(matchId: string, events: RecordEvent[]): Promise<void> {
  return putValue("matchEvents", matchRecordKey(matchId, "events"), matchId, events);
}

export async function loadOfflineEvents(matchId: string): Promise<RecordEvent[]> {
  return (await getValue<RecordEvent[]>("matchEvents", matchRecordKey(matchId, "events"))) ?? [];
}

export function saveOfflineParticipants(matchId: string, participants: ConsoleParticipant[]): Promise<void> {
  return putValue("matchParticipants", matchRecordKey(matchId, "participants"), matchId, participants);
}

export async function loadOfflineParticipants(matchId: string): Promise<ConsoleParticipant[]> {
  return (
    await getValue<ConsoleParticipant[]>(
      "matchParticipants",
      matchRecordKey(matchId, "participants"),
    )
  ) ?? [];
}

export function savePendingActions(matchId: string, actions: OfflineQueueItem[]): Promise<void> {
  const ordered = [...actions].sort((a, b) => a.localSequence - b.localSequence);
  return putValue("pendingActions", matchRecordKey(matchId, "pending"), matchId, ordered);
}

export async function loadPendingActions(matchId: string): Promise<OfflineQueueItem[]> {
  const actions =
    (await getValue<OfflineQueueItem[]>(
      "pendingActions",
      matchRecordKey(matchId, "pending"),
    )) ?? [];
  return [...actions].sort((a, b) => a.localSequence - b.localSequence);
}

export async function clearOfflineMatchData(matchId: string): Promise<void> {
  await Promise.all([
    deleteValue("matchSnapshots", matchRecordKey(matchId, "snapshot")),
    deleteValue("matchEvents", matchRecordKey(matchId, "events")),
    deleteValue("matchParticipants", matchRecordKey(matchId, "participants")),
    deleteValue("pendingActions", matchRecordKey(matchId, "pending")),
  ]);
}
