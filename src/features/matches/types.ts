export const MATCH_SIDES = ["home", "away"] as const;
export type TeamSide = (typeof MATCH_SIDES)[number];

export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type MatchResultSource = "console" | "manual";

export type MatchRulesInput = {
  periodCount: number;
  periodSeconds: number;
  halftimeSeconds: number;
  overtimeEnabled: boolean;
  overtimePeriodCount: number;
  overtimePeriodSeconds: number;
  teamTimeoutsPerGame: number;
  teamTimeoutsPerPeriod: number;
  teamTimeoutSeconds: number;
};

export type MatchInput = {
  teamId: string;
  name: string;
  opponentName: string;
  teamSide: TeamSide;
  scheduledAt: string;
  venue: string | null;
  memo: string | null;
  isPublic: boolean;
  rules: MatchRulesInput;
};

export type MatchRosterInput = {
  matchId: string;
  teamMemberIds: string[];
};

export type MatchListItem = {
  id: string;
  teamId: string;
  name: string;
  opponentName: string;
  teamSide: TeamSide;
  scheduledAt: string;
  venue: string | null;
  status: MatchStatus;
  isPublic: boolean;
};

export type MatchRulesRecord = MatchRulesInput & {
  matchId: string;
};

export type MatchRosterRecord = {
  id: string;
  matchId: string;
  teamMemberId: string | null;
  kind: "player" | "staff";
  fullNameSnapshot: string;
  displayNameSnapshot: string | null;
  shirtNumberSnapshot: number | null;
  primaryPositionSnapshot: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "PV" | null;
};

export type MatchRecord = MatchListItem & {
  memo: string | null;
  competitionName: string | null;
  completedAt: string | null;
  resultSource: MatchResultSource;
  homeScore: number;
  awayScore: number;
  rules: MatchRulesRecord;
  roster: MatchRosterRecord[];
};

export type MatchRosterCandidate = {
  id: string;
  kind: "player" | "staff";
  fullName: string;
  displayName: string | null;
  shirtNumber: number | null;
  primaryPosition: "GK" | "LW" | "LB" | "CB" | "RB" | "RW" | "PV" | null;
};

export type MatchRosterSelection = {
  matchId: string;
  teamId: string;
  matchName: string;
  opponentName: string;
  candidates: MatchRosterCandidate[];
  selectedIds: string[];
  hasConfiguredRoster: boolean;
};
