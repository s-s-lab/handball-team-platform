export type SeasonRecordMatch = {
  teamSide: "home" | "away";
  status: "scheduled" | "live" | "finished" | "cancelled";
  homeScore: number;
  awayScore: number;
};

export type SeasonRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type SeasonLeaderboardRow = {
  teamMemberId: string;
  displayName: string;
  shirtNumber: number | null;
  appearances: number;
  goals: number;
  saves: number;
  shotsFaced: number;
};

function rounded(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function shirtNumberOrder(value: number | null) {
  return value ?? Number.POSITIVE_INFINITY;
}

export function deriveSeasonRecord(matches: SeasonRecordMatch[]): SeasonRecord {
  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const match of matches) {
    if (match.status !== "finished") continue;

    const teamScore = match.teamSide === "home" ? match.homeScore : match.awayScore;
    const opponentScore = match.teamSide === "home" ? match.awayScore : match.homeScore;

    played += 1;
    goalsFor += teamScore;
    goalsAgainst += opponentScore;

    if (teamScore > opponentScore) wins += 1;
    else if (teamScore < opponentScore) losses += 1;
    else draws += 1;
  }

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
  };
}

export function savePercentage(saves: number, shotsFaced: number): number | null {
  if (shotsFaced <= 0) return null;
  return rounded((saves / shotsFaced) * 100, 1);
}

export function goalsPerAppearance(goals: number, appearances: number): number | null {
  if (appearances <= 0) return null;
  return rounded(goals / appearances, 2);
}

export function sortScoringLeaderboard<T extends SeasonLeaderboardRow>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    if (right.goals !== left.goals) return right.goals - left.goals;

    const leftRate = goalsPerAppearance(left.goals, left.appearances) ?? -1;
    const rightRate = goalsPerAppearance(right.goals, right.appearances) ?? -1;
    if (rightRate !== leftRate) return rightRate - leftRate;

    const shirtDifference = shirtNumberOrder(left.shirtNumber) - shirtNumberOrder(right.shirtNumber);
    if (shirtDifference !== 0) return shirtDifference;

    return left.displayName.localeCompare(right.displayName, "ja");
  });
}

export function sortGoalkeeperLeaderboard<T extends SeasonLeaderboardRow>(rows: T[]): T[] {
  return rows
    .filter((row) => row.shotsFaced > 0)
    .sort((left, right) => {
      const leftPercentage = savePercentage(left.saves, left.shotsFaced) ?? -1;
      const rightPercentage = savePercentage(right.saves, right.shotsFaced) ?? -1;
      if (rightPercentage !== leftPercentage) return rightPercentage - leftPercentage;
      if (right.saves !== left.saves) return right.saves - left.saves;

      const shirtDifference = shirtNumberOrder(left.shirtNumber) - shirtNumberOrder(right.shirtNumber);
      if (shirtDifference !== 0) return shirtDifference;

      return left.displayName.localeCompare(right.displayName, "ja");
    });
}
