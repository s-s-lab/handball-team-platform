import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { MatchForm } from "@/components/matches/match-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamForCurrentUser } from "@/features/team-core/data";

type NewMatchPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewMatchPage({ params, searchParams }: NewMatchPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team || !team.role) notFound();

  return (
    <main className="flex max-w-4xl flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link href={`/app/teams/${team.id}`}>
          <ArrowLeft aria-hidden="true" /> {team.name}へ戻る
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>試合を作成</CardTitle>
          <CardDescription>
            対戦情報とルールを登録したあと、この試合に参加する選手・スタッフを選択します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchForm teamId={team.id} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
