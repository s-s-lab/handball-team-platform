import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  PencilLine,
  TimerReset,
} from "lucide-react";
import { notFound } from "next/navigation";
import { MatchRecordSummary } from "@/components/matches/match-record-summary";
import { MatchRecordTimeline } from "@/components/matches/match-record-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMatchRecordEvents } from "@/features/match-records/data";
import { getMatchForCurrentUser } from "@/features/matches/data";
import type { MatchRosterRecord, MatchStatus } from "@/features/matches/types";

type MatchPageProps = {
  params: Promise<{ matchId: string }>;
};

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "予定",
  live: "試合中",
  finished: "終了",
  cancelled: "中止",
};

function formatJapanDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function minutes(seconds: number) {
  return seconds / 60;
}

function RosterSection({ title, roster }: { title: string; roster: MatchRosterRecord[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{roster.length}名</span>
      </div>
      {roster.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {roster.map((member) => (
            <div
              key={member.id}
              className="flex min-h-16 items-center gap-4 rounded-xl border border-border px-4 py-3"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-sm font-black text-foreground">
                {member.shirtNumberSnapshot ?? "–"}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{member.fullNameSnapshot}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {member.kind === "player" ? "選手" : "スタッフ"}
                  {member.primaryPositionSnapshot ? ` · ${member.primaryPositionSnapshot}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          選択されていません。
        </p>
      )}
    </section>
  );
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { matchId } = await params;
  const match = await getMatchForCurrentUser(matchId);
  if (!match) notFound();

  const recordEvents =
    match.resultSource === "console" ? await listMatchRecordEvents(matchId) : [];
  const players = match.roster.filter((member) => member.kind === "player");
  const staff = match.roster.filter((member) => member.kind === "staff");
  const rules = match.rules;
  const homeName = match.teamSide === "home" ? "自チーム" : match.opponentName;
  const awayName = match.teamSide === "away" ? "自チーム" : match.opponentName;
  const isFinished = match.status === "finished";
  const isManualResult = match.resultSource === "manual";

  return (
    <main className="flex max-w-5xl flex-col gap-7">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link href={`/app/teams/${match.teamId}/matches`}>
          <ArrowLeft aria-hidden="true" /> 試合へ戻る
        </Link>
      </Button>

      <section className="overflow-hidden bg-[var(--workspace-ink)] text-white">
        <div className="grid gap-7 px-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-8 md:py-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black tracking-[0.14em] text-white/55">
              <span>{statusLabels[match.status]}</span>
              {match.competitionName ? <span>{match.competitionName}</span> : null}
              {isFinished ? (
                <span>{isManualResult ? "手入力" : "Match Console記録"}</span>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">{match.name}</h1>
            <p className="mt-3 text-lg font-bold text-white/85">
              {match.teamSide === "home" ? "HOME" : "AWAY"} vs {match.opponentName}
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-white/60 sm:flex-row sm:flex-wrap sm:gap-x-5">
              <span className="inline-flex items-center gap-2">
                <CalendarDays aria-hidden="true" /> {formatJapanDateTime(match.scheduledAt)}
              </span>
              {match.venue ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin aria-hidden="true" /> {match.venue}
                </span>
              ) : null}
            </div>
          </div>

          {isFinished ? (
            <div className="min-w-[13rem] border-t border-white/15 pt-5 text-right md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <p className="text-xs font-black tracking-[0.2em] text-white/50">FINAL</p>
              <p className="mt-2 text-5xl font-black tabular-nums tracking-[-0.06em] md:text-6xl">
                {match.homeScore}
                <span className="px-3 text-2xl text-white/35">-</span>
                {match.awayScore}
              </p>
              <div className="mt-2 flex justify-end gap-5 text-xs font-bold text-white/55">
                <span>{homeName}</span>
                <span>{awayName}</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {match.memo ? (
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{match.memo}</p>
      ) : null}

      {!isFinished ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/app/matches/${match.id}/roster`}>
              <PencilLine aria-hidden="true" /> ロスターを編集
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/app/matches/${match.id}/console`}>
              <TimerReset aria-hidden="true" /> MATCH CONSOLE
            </Link>
          </Button>
        </div>
      ) : null}

      {isManualResult ? (
        <div className="border-l-4 border-[var(--workspace-accent)] bg-muted/55 px-4 py-3 text-sm leading-6 text-muted-foreground">
          この試合は過去の記録から最終結果を手入力しています。得点者・警告・2分間退場などの時系列ログが残っていない場合でも、正式な試合結果として一覧・集計に利用できます。
        </div>
      ) : (
        <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
          MATCH CONSOLEではタイマー・得点に加えて、7m、警告、2分間退場、失格、チームタイムアウトを公式経過時刻とともに記録できます。保存された履歴は下の「試合記録」から振り返れます。
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>試合ルール</CardTitle>
          <CardDescription>この試合に保存されているルール設定です。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">通常時間</p>
            <p className="mt-1 font-bold">
              {rules.periodCount} × {minutes(rules.periodSeconds)}分
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">ハーフタイム</p>
            <p className="mt-1 font-bold">{minutes(rules.halftimeSeconds)}分</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">延長</p>
            <p className="mt-1 font-bold">
              {rules.overtimeEnabled
                ? `${rules.overtimePeriodCount} × ${minutes(rules.overtimePeriodSeconds)}分`
                : "なし"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">チームタイムアウト</p>
            <p className="mt-1 font-bold">{rules.teamTimeoutsPerGame}回 / 試合</p>
            <p className="mt-1 text-xs text-muted-foreground">
              最大{rules.teamTimeoutsPerPeriod}回 / ピリオド · {rules.teamTimeoutSeconds}秒
            </p>
          </div>
        </CardContent>
      </Card>

      {!isManualResult ? (
        <section className="flex flex-col gap-4" aria-labelledby="match-record-heading">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground">MATCH RECORD</p>
            <h2 id="match-record-heading" className="mt-1 text-2xl font-black tracking-tight">
              試合記録
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              MATCH CONSOLEで入力した記録を、集計と時系列の両方から確認できます。訂正した記録も履歴として保持します。
            </p>
          </div>
          <MatchRecordSummary
            events={recordEvents}
            homeName={homeName}
            awayName={awayName}
            periodCount={rules.periodCount}
          />
          <MatchRecordTimeline
            events={recordEvents}
            homeName={homeName}
            awayName={awayName}
            periodCount={rules.periodCount}
          />
        </section>
      ) : null}

      {!isManualResult || match.roster.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>試合ロスター</CardTitle>
            <CardDescription>
              保存時点の氏名・背番号・ポジションを保持します。チーム名簿を後から変更してもこの表示は変わりません。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-7">
            <RosterSection title="選手" roster={players} />
            <RosterSection title="スタッフ" roster={staff} />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
