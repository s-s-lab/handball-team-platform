import { notFound } from "next/navigation";
import { SeasonStatsBoard } from "@/components/season-stats/season-stats-board";
import { getSeasonStatsWorkspace } from "@/features/season-stats/data";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type TeamStatsPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ season?: string; error?: string; success?: string }>;
};

export default async function TeamStatsPage({ params, searchParams }: TeamStatsPageProps) {
  const [{ teamId }, search] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team?.role) notFound();

  const workspace = await getSeasonStatsWorkspace(teamId, search.season ?? null);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {search.error ? (
        <div role="alert" className="mb-5 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive">
          {search.error}
        </div>
      ) : null}
      {search.success ? (
        <div className="mb-5 border border-[var(--workspace-success)]/30 bg-[var(--workspace-success)]/5 px-4 py-3 text-sm font-bold text-[var(--workspace-success)]">
          {search.success}
        </div>
      ) : null}
      <SeasonStatsBoard
        teamId={team.id}
        teamName={team.name}
        isAdmin={team.role === "admin"}
        seasons={workspace.seasons}
        selectedSeason={workspace.selectedSeason}
        record={workspace.record}
        players={workspace.players}
        matches={workspace.matches}
      />
    </div>
  );
}
