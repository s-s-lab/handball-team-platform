import Link from "next/link";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import { updateTeamVisibility } from "@/features/team-core/actions";
import { RosterList } from "@/components/team-core/roster-list";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team) notFound();

  const isAdmin = team.role === "admin";

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/app">
            <ArrowLeft aria-hidden="true" /> ホームへ戻る
          </Link>
        </Button>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">チーム</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{team.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">/{team.slug}</p>
            {team.description ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{team.description}</p>
            ) : null}
          </div>

          {isAdmin ? (
            <Button asChild size="lg">
              <Link href={`/app/teams/${team.id}/members/new`}>
                <Plus aria-hidden="true" /> メンバーを追加
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {query.error ? (
        <div
          role="alert"
          className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {query.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>公開設定</CardTitle>
          <CardDescription>
            チームを公開しても、各メンバーは個別に公開をONにしない限り公開されません。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{team.isPublic ? "一般公開中" : "非公開"}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {team.isPublic
                ? "公開ページからチーム情報と公開許可済みメンバーを閲覧できます。"
                : "現在、一般ユーザーからこのチームは閲覧できません。"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {team.isPublic ? (
              <Button asChild variant="outline">
                <Link href={`/teams/${team.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" /> 公開ページを見る
                </Link>
              </Button>
            ) : null}

            {isAdmin ? (
              <form action={updateTeamVisibility}>
                <input type="hidden" name="teamId" value={team.id} />
                <input type="hidden" name="isPublic" value={team.isPublic ? "" : "on"} />
                <PendingSubmitButton
                  idleLabel={team.isPublic ? "公開を停止" : "チームを公開"}
                  pendingLabel="更新中…"
                />
              </form>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <RosterList teamId={team.id} roster={team.roster} isAdmin={isAdmin} />
    </main>
  );
}
