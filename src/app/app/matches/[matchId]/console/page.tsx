import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { MatchConsole } from "@/components/match-console/match-console";
import { Button } from "@/components/ui/button";
import { getMatchConsoleForCurrentUser } from "@/features/match-console/data";

type MatchConsolePageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function MatchConsolePage({ params }: MatchConsolePageProps) {
  const { matchId } = await params;
  const data = await getMatchConsoleForCurrentUser(matchId);
  if (!data) notFound();

  return (
    <main className="flex w-full max-w-7xl flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link href={`/app/matches/${data.matchId}`}>
          <ArrowLeft aria-hidden="true" /> 試合設定へ戻る
        </Link>
      </Button>

      <MatchConsole data={data} />
    </main>
  );
}
