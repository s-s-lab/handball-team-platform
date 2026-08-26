import type { MatchStatus, TeamSide } from "@/features/matches/types";

export type MatchResultOutcome = "win" | "draw" | "loss";

export type ResultScoreInput = {
  teamSide: TeamSide;
  homeScore: number;
  awayScore: number;
};

export type SplittableMatch = ResultScoreInput & {
  id: string;
  scheduledAt: string;
  status: MatchStatus;
};

export function scoreForTeam(match: ResultScoreInput) {
  return match.teamSide === "home"
    ? { team: match.homeScore, opponent: match.awayScore }
    : { team: match.awayScore, opponent: match.homeScore };
}

export function classifyMatchResult(match: ResultScoreInput): MatchResultOutcome {
  const score = scoreForTeam(match);
  if (score.team > score.opponent) return "win";
  if (score.team < score.opponent) return "loss";
  return "draw";
}

function scheduledTime(match: SplittableMatch) {
  return new Date(match.scheduledAt).getTime();
}

export function splitTeamMatches<T extends SplittableMatch>(matches: T[]) {
  const upcoming = matches
    .filter((match) => match.status === "live" || match.status === "scheduled")
    .sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      return scheduledTime(a) - scheduledTime(b);
    });

  const results = matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => scheduledTime(b) - scheduledTime(a));

  const cancelled = matches
    .filter((match) => match.status === "cancelled")
    .sort((a, b) => scheduledTime(b) - scheduledTime(a));

  return { upcoming, results, cancelled };
}
