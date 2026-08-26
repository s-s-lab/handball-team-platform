import { notFound } from "next/navigation";
import { MatchResultsBoard } from "@/components/match-results/match-results-board";
import { listTeamMatchResults } from "@/features/match-results/data";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type TeamMatchesPageProps = {
  params: Promise<{ teamId: string }>;
};

export default async function TeamMatchesPage({ params }: TeamMatchesPageProps) {
  const { teamId } = await params;
  const team = await getTeamForCurrentUser(teamId);
  if (!team || !team.role) notFound();

  const matches = await listTeamMatchResults(team.id);

  return (
    <main>
      <MatchResultsBoard
        teamId={team.id}
        teamName={team.name}
        matches={matches}
        isAdmin={team.role === "admin"}
      />
    </main>
  );
}
