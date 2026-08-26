export type PublicMatchStatus = "scheduled" | "live" | "finished" | "cancelled";
export type PublicTeamSide = "home" | "away";

export type PublicLiveRules = {
  periodCount: number;
  periodSeconds: number;
  overtimeEnabled: boolean;
  overtimePeriodCount: number;
  overtimePeriodSeconds: number;
};

export type PublicLiveState = {
  version: number;
  currentPeriod: number;
  clockElapsedMs: number;
  clockRunning: boolean;
  clockStartedAt: string | null;
  homeScore: number;
  awayScore: number;
};

export type PublicLiveMatch = {
  matchId: string;
  matchName: string;
  teamId: string;
  teamName: string;
  teamShortName: string | null;
  opponentName: string;
  teamSide: PublicTeamSide;
  scheduledAt: string;
  venue: string | null;
  status: PublicMatchStatus;
  serverNow: string;
  rules: PublicLiveRules;
  state: PublicLiveState;
};

export type PublicMatchSummary = {
  matchId: string;
  matchName: string;
  opponentName: string;
  teamSide: PublicTeamSide;
  scheduledAt: string;
  venue: string | null;
  status: PublicMatchStatus;
  homeScore: number;
  awayScore: number;
};
