export type SeasonSummaryRow = {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type SeasonRosterRow = {
  id: string;
  fullName: string;
  displayName: string | null;
  shirtNumber: number | null;
  primaryPosition: string | null;
  isActive: boolean;
};

type SeasonStatsDatabaseRow = {
  team_member_id: string;
  appearances: number;
  starts: number;
  goals: number;
  seven_meter_goals: number;
  seven_meter_attempts: number;
  warnings: number;
  two_minute_suspensions: number;
  disqualifications: number;
  saves: number;
  shots_faced: number;
  notes: string | null;
};

export type SeasonPlayerViewRow = {
  teamMemberId: string;
  displayName: string;
  shirtNumber: number | null;
  primaryPosition: string | null;
  appearances: number;
  starts: number;
  goals: number;
  sevenMeterGoals: number;
  sevenMeterAttempts: number;
  warnings: number;
  twoMinuteSuspensions: number;
  disqualifications: number;
  saves: number;
  shotsFaced: number;
  notes: string | null;
};

export function selectSeason(
  seasons: SeasonSummaryRow[],
  requestedSeasonId: string | null | undefined,
): SeasonSummaryRow | null {
  if (requestedSeasonId) {
    const requested = seasons.find((season) => season.id === requestedSeasonId);
    if (requested) return requested;
  }
  return seasons.find((season) => season.isCurrent) ?? seasons[0] ?? null;
}

export function mergeSeasonPlayerRows(
  roster: SeasonRosterRow[],
  stats: SeasonStatsDatabaseRow[],
): SeasonPlayerViewRow[] {
  const statsByMember = new Map(stats.map((row) => [row.team_member_id, row]));

  return [...roster]
    .sort((left, right) => {
      if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
      const leftNumber = left.shirtNumber ?? Number.POSITIVE_INFINITY;
      const rightNumber = right.shirtNumber ?? Number.POSITIVE_INFINITY;
      if (leftNumber !== rightNumber) return leftNumber - rightNumber;
      return (left.displayName ?? left.fullName).localeCompare(right.displayName ?? right.fullName, "ja");
    })
    .map((member) => {
      const saved = statsByMember.get(member.id);
      return {
        teamMemberId: member.id,
        displayName: member.displayName ?? member.fullName,
        shirtNumber: member.shirtNumber,
        primaryPosition: member.primaryPosition,
        appearances: saved?.appearances ?? 0,
        starts: saved?.starts ?? 0,
        goals: saved?.goals ?? 0,
        sevenMeterGoals: saved?.seven_meter_goals ?? 0,
        sevenMeterAttempts: saved?.seven_meter_attempts ?? 0,
        warnings: saved?.warnings ?? 0,
        twoMinuteSuspensions: saved?.two_minute_suspensions ?? 0,
        disqualifications: saved?.disqualifications ?? 0,
        saves: saved?.saves ?? 0,
        shotsFaced: saved?.shots_faced ?? 0,
        notes: saved?.notes ?? null,
      };
    });
}
