import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronRight, ExternalLink, MapPin, Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { getTeamForCurrentUser } from "@/features/team-core/data";
import { updateTeamVisibility } from "@/features/team-core/actions";
import { listTeamMatches } from "@/features/matches/data";
import type { MatchStatus } from "@/features/matches/types";
import { RosterList } from "@/components/team-core/roster-list";
import { PendingSubmitButton } from "@/components/auth/pending-submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ error?: string }>;
};

const matchStatusLabels: Record<MatchStatus, string> = {
  scheduled: "予定",
  live: "試合中",
  finished: "終了",
  cancelled: "中止",
};

function formatJapanDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function TeamPage({ params, searchParams }: TeamPageProps) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const team = await getTeamForCurrentUser(teamId);
  if (!team) notFound();

  const isAdmin = team.role === "admin";
  const canManageMatches = team.role !== null;
  const matches = canManageMatches ? await listTeamMatches(team.id) : [];

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

          <div className="flex flex-wrap gap-2">
            {canManageMatches ? (
              <Button asChild size="lg">
                <Link href={`/app/teams/${team.id}/matches/new`}>
                  <CalendarDays aria-hidden="true" /> 試合を作成
                </Link>
              </Button>
            ) : null}
            {isAdmin ? (
              <Button asChild size="lg" variant="outline">
                <Link href={`/app/teams/${team.id}/members/new`}>
                  <Plus aria-hidden="true" /> メンバーを追加
                </Link>
              </Button>
            ) : null}
          </div>
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
          <CardTitle>試合</CardTitle>
          <CardDescription>このチームの試合予定と保存済みの試合を確認できます。</CardDescription>
        </CardHeader>
        <CardContent>
          {matches.length ? (
            <div className="flex flex-col gap-2">
              {matches.map((match) => (
                <Link
                  key={match.id}
                  href={`/app/matches/${match.id}`}
                  className="group flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-bold text-foreground">{match.name}</p>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {matchStatusLabels[match.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      {match.teamSide === "home" ? "HOME" : "AWAY"} vs {match.opponentName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays aria-hidden="true" /> {formatJapanDateTime(match.scheduledAt)}
                      </span>
                      {match.venue ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin aria-hidden="true" /> {match.venue}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight aria-hidden="true" className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border p-5">
              <div>
                <p className="font-semibold">まだ試合はありません。</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  試合情報とルールを登録すると、ここからロスター設定へ進めます。
                </p>
              </div>
              {canManageMatches ? (
                <Button asChild>
                  <Link href={`/app/teams/${team.id}/matches/new`}>
                    <CalendarDays aria-hidden="true" /> 最初の試合を作成
                  </Link>
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
