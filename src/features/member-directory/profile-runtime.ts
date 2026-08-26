import type { MatchStatus } from "@/features/matches/types";
import type { HandballPosition, TeamMemberRecord } from "@/features/team-core/types";

export type MemberAppearance = {
  matchId: string;
  matchName: string;
  opponentName: string;
  scheduledAt: string;
  venue: string | null;
  status: MatchStatus;
  shirtNumber: number | null;
  primaryPosition: HandballPosition | null;
};

type AppearanceRosterRow = {
  matchId: string;
  shirtNumberSnapshot: number | null;
  primaryPositionSnapshot: HandballPosition | null;
};

type AppearanceMatch = {
  id: string;
  name: string;
  opponentName: string;
  scheduledAt: string;
  venue: string | null;
  status: MatchStatus;
};

export function buildMemberAppearances({
  member,
  rosterRows,
  matches,
}: {
  member: TeamMemberRecord;
  rosterRows: AppearanceRosterRow[];
  matches: AppearanceMatch[];
}): MemberAppearance[] {
  const matchById = new Map(matches.map((match) => [match.id, match]));

  return rosterRows
    .map((row) => {
      const match = matchById.get(row.matchId);
      if (!match) return null;

      return {
        matchId: match.id,
        matchName: match.name,
        opponentName: match.opponentName,
        scheduledAt: match.scheduledAt,
        venue: match.venue,
        status: match.status,
        shirtNumber: row.shirtNumberSnapshot ?? member.shirtNumber,
        primaryPosition: row.primaryPositionSnapshot ?? member.primaryPosition,
      } satisfies MemberAppearance;
    })
    .filter((appearance): appearance is MemberAppearance => appearance !== null)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}
