import type { RecordEvent } from "@/features/match-records/types";

export const CONSOLE_ACTIONS = [
  "start_clock",
  "stop_clock",
  "reset_clock",
  "set_period",
  "goal",
  "attribute_goal",
  "undo_last_goal",
  "seven_meter_missed",
  "warning",
  "suspension",
  "disqualification",
  "team_timeout",
  "revert_event",
  "finish_match",
] as const;

export type ConsoleActionName = (typeof CONSOLE_ACTIONS)[number];
export type ConsoleMatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type ConsoleTeamSide = "home" | "away";

export type ConsoleSnapshot = {
  matchId: string;
  version: number;
  currentPeriod: number;
  clockElapsedMs: number;
  competitionElapsedMs: number;
  clockRunning: boolean;
  clockStartedAt: string | null;
  homeScore: number;
  awayScore: number;
  matchStatus: ConsoleMatchStatus;
  periodDurationMs: number;
  serverNow: string;
};

export type ConsoleRules = {
  periodCount: number;
  periodSeconds: number;
  overtimeEnabled: boolean;
  overtimePeriodCount: number;
  overtimePeriodSeconds: number;
};

export type ConsoleParticipant = {
  matchRosterId: string;
  teamMemberId: string | null;
  kind: "player" | "staff";
  displayName: string;
  shirtNumber: number | null;
  primaryPosition: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "PV" | null;
};

export type ConsoleActionPayload = Record<string, string | number | boolean>;

export type ConsoleActionInput = {
  matchId: string;
  clientActionId: string;
  expectedVersion: number;
  action: ConsoleActionName;
  payload: ConsoleActionPayload;
};

export type MatchConsoleData = {
  matchId: string;
  matchName: string;
  teamId: string;
  managedSide: ConsoleTeamSide;
  homeName: string;
  awayName: string;
  rules: ConsoleRules;
  participants: ConsoleParticipant[];
  recordEvents: RecordEvent[];
  snapshot: ConsoleSnapshot;
};

export type ConsoleActionResult =
  | { ok: true; snapshot: ConsoleSnapshot; message?: string }
  | { ok: false; message: string; snapshot?: ConsoleSnapshot };
