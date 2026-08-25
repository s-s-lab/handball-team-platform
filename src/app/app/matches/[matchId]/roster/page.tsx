import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { MatchRosterForm } from "@/components/matches/match-roster-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listActiveTeamMembersForMatch } from "@/features/matches/data";

type MatchRosterPageProps = {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MatchRosterPage({ params, searchParams }: MatchRosterPageProps) {
  const [{ matchId }, query] = await Promise.all([params, searchParams]);
  const selection = await listActiveTeamMembersForMatch(matchId);
  if (!selection) notFound();

  return (
    <main className="flex max-w-5xl flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link href={`/app/teams/${selection.teamId}`}>
          <ArrowLeft aria-hidden="true" /> チームへ戻る
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>試合ロスターを設定</CardTitle>
          <CardDescription>
            {selection.matchName} · vs {selection.opponentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MatchRosterForm selection={selection} error={query.error} />
        </CardContent>
      </Card>
    </main>
  );
}
