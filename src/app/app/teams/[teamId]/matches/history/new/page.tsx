import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ManualMatchResultForm } from "@/components/match-results/manual-match-result-form";
import { Button } from "@/components/ui/button";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type NewHistoricalMatchResultPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewHistoricalMatchResultPage({
  params,
  searchParams,
}: NewHistoricalMatchResultPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || team.role !== "admin") notFound();

  return (
    <main className="mx-auto w-full max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/app/teams/${team.id}/matches`}>
          <ArrowLeft aria-hidden="true" /> 試合へ戻る
        </Link>
      </Button>

      <ManualMatchResultForm teamId={team.id} error={query.error} />
    </main>
  );
}
