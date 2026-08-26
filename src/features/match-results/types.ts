import type { MatchStatus, TeamSide } from "@/features/matches/types";

export type MatchResultSource = "console" | "manual";

export type TeamMatchResultItem = {
  id: string;
  teamId: string;
  name: string;
  competitionName: string | null;
  opponentName: string;
  teamSide: TeamSide;
  scheduledAt: string;
  venue: string | null;
  status: MatchStatus;
  isPublic: boolean;
  completedAt: string | null;
  resultSource: MatchResultSource;
  homeScore: number;
  awayScore: number;
};

export type ManualMatchResultInput = {
  teamId: string;
  name: string;
  competitionName: string | null;
  opponentName: string;
  teamSide: TeamSide;
  scheduledAt: string;
  venue: string | null;
  memo: string | null;
  isPublic: boolean;
  teamScore: number;
  opponentScore: number;
};
