export const MATCH_SIDES = ["home", "away"] as const;
export type TeamSide = (typeof MATCH_SIDES)[number];

export type MatchStatus = "scheduled" | "live" | "finished" | "cancelled";

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
  rules: MatchRulesRecord;
  roster: MatchRosterRecord[];
};
