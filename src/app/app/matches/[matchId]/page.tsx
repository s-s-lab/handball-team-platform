import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin, PencilLine, TimerReset } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
            <div key={member.id} className="flex min-h-16 items-center gap-4 rounded-xl border border-border px-4 py-3">
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

  const players = match.roster.filter((member) => member.kind === "player");
  const staff = match.roster.filter((member) => member.kind === "staff");
  const rules = match.rules;

  return (
    <main className="flex max-w-5xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link href={`/app/teams/${match.teamId}`}>
          <ArrowLeft aria-hidden="true" /> チームへ戻る
        </Link>
      </Button>

      <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{statusLabels[match.status]}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{match.name}</h1>
          <p className="mt-3 text-lg font-bold text-foreground">
            {match.teamSide === "home" ? "HOME" : "AWAY"} vs {match.opponentName}
          </p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden="true" /> {formatJapanDateTime(match.scheduledAt)}
            </span>
            {match.venue ? (
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" /> {match.venue}
              </span>
            ) : null}
          </div>
          {match.memo ? <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">{match.memo}</p> : null}
        </div>

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
      </section>

      <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
        MATCH CONSOLEではタイマー、ピリオド、得点、Undo、試合終了を操作できます。終了済みの試合は最終状態を確認できます。
      </div>

      <Card>
        <CardHeader>
          <CardTitle>試合ルール</CardTitle>
          <CardDescription>この試合に保存されているルール設定です。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">通常時間</p>
            <p className="mt-1 font-bold">{rules.periodCount} × {minutes(rules.periodSeconds)}分</p>
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
    </main>
  );
}
