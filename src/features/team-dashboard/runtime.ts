import type { MatchStatus, TeamSide } from "@/features/matches/types";

export type DashboardResult = "win" | "draw" | "loss";

export type DashboardMatch = {
  id: string;
  name: string;
  opponentName: string;
  teamSide: TeamSide;
  scheduledAt: string;
  venue: string | null;
  status: MatchStatus;
  homeScore: number;
  awayScore: number;
};

export type DashboardScorer = {
  teamMemberId: string | null;
  displayName: string;
  shirtNumber: number | null;
  goals: number;
};

export type DashboardRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
};

export type TeamDashboardSummary = {
  nextMatch: DashboardMatch | null;
  latestResult: DashboardMatch | null;
  record: DashboardRecord;
  currentSeasonName?: string | null;
  activeMemberCount: number;
  topScorers: DashboardScorer[];
};

export function classifyTeamResult(match: Pick<DashboardMatch, "teamSide" | "homeScore" | "awayScore">): DashboardResult {
  const teamScore = match.teamSide === "home" ? match.homeScore : match.awayScore;
  const opponentScore = match.teamSide === "home" ? match.awayScore : match.homeScore;
  if (teamScore > opponentScore) return "win";
  if (teamScore < opponentScore) return "loss";
  return "draw";
}

function matchTime(match: DashboardMatch) {
  return new Date(match.scheduledAt).getTime();
}

export function buildDashboardSummary(input: {
  now: Date;
  activeMemberCount: number;
  matches: DashboardMatch[];
  recordMatches?: DashboardMatch[];
  currentSeasonName?: string | null;
  scorers: DashboardScorer[];
}): TeamDashboardSummary {
  const nowMs = input.now.getTime();
  const nextMatch = [...input.matches]
    .filter((match) => match.status === "live" || (match.status === "scheduled" && matchTime(match) >= nowMs))
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return matchTime(a) - matchTime(b);
    })[0] ?? null;

  const finished = input.matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => matchTime(b) - matchTime(a));

  const recordFinished = (input.recordMatches ?? input.matches)
    .filter((match) => match.status === "finished");

  const record = recordFinished.reduce<DashboardRecord>(
    (acc, match) => {
      const result = classifyTeamResult(match);
      acc.played += 1;
      if (result === "win") acc.wins += 1;
      if (result === "draw") acc.draws += 1;
      if (result === "loss") acc.losses += 1;
      return acc;
    },
    { played: 0, wins: 0, draws: 0, losses: 0 },
  );

  const topScorers = [...input.scorers]
    .filter((scorer) => scorer.goals > 0)
    .sort((a, b) => b.goals - a.goals || (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999) || a.displayName.localeCompare(b.displayName, "ja"))
    .slice(0, 3);

  return {
    nextMatch,
    latestResult: finished[0] ?? null,
    record,
    currentSeasonName: input.currentSeasonName ?? null,
    activeMemberCount: Math.max(0, input.activeMemberCount),
    topScorers,
  };
}
