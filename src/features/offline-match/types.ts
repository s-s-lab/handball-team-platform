import type {
  ConsoleActionName,
  ConsoleActionPayload,
  ConsoleSnapshot,
  ConsoleTeamSide,
} from "@/features/match-console/types";
import type { RecordEvent } from "@/features/match-records/types";

export type OfflineMatchRules = {
  periodCount: number;
  periodSeconds: number;
  overtimeEnabled: boolean;
  overtimePeriodCount: number;
  overtimePeriodSeconds: number;
  teamTimeoutsPerGame: number;
  teamTimeoutsPerPeriod: number;
};

export type OfflineMatchState = {
  snapshot: ConsoleSnapshot;
  rules: OfflineMatchRules;
  managedSide: ConsoleTeamSide;
  events: RecordEvent[];
  nextLocalSequence: number;
};

export type OfflineLocalAction = {
  clientActionId: string;
  action: ConsoleActionName;
  payload: ConsoleActionPayload;
};

export type OfflineLocalActionResult =
  | { ok: true; state: OfflineMatchState; event: RecordEvent }
  | { ok: false; message: string };

export type OfflineEventTime = {
  period: number;
  periodElapsedMs: number;
  competitionElapsedMs: number;
};

export type OfflineQueueSyncState = "pending" | "replaying" | "failed";

export type OfflineQueueItem = {
  clientActionId: string;
  matchId: string;
  localSequence: number;
  action: ConsoleActionName;
  payload: ConsoleActionPayload;
  baseServerVersion: number;
  eventTime: OfflineEventTime;
  enqueuedAt: string;
  syncState: OfflineQueueSyncState;
};

export type OfflineQueueBuildInput = Omit<OfflineQueueItem, "localSequence" | "syncState">;
export type OfflineReplayState = "empty" | "ready" | "conflict";
