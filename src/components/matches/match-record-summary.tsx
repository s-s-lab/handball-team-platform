import { formatClock } from "@/features/match-console/runtime";
import { deriveMatchRecordSummary } from "@/features/match-records/runtime";
import type { RecordEvent, TeamSide } from "@/features/match-records/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MatchRecordSummaryProps = {
  events: RecordEvent[];
  homeName: string;
  awayName: string;
  periodCount: number;
};

function participantName(shirtNumber: number | null, displayName: string | null) {
  if (shirtNumber !== null && displayName) return `#${shirtNumber} ${displayName}`;
  if (shirtNumber !== null) return `#${shirtNumber}`;
  return displayName ?? "対象者未設定";
}

function sideName(side: TeamSide | null, homeName: string, awayName: string) {
  if (side === "home") return homeName;
  if (side === "away") return awayName;
  return "チーム未設定";
}

function periodLabel(period: number | null, periodCount: number) {
  if (period === null) return "時刻未記録";
  if (periodCount === 2 && period === 1) return "前半";
  if (periodCount === 2 && period === 2) return "後半";
  if (period <= periodCount) return `第${period}ピリオド`;
  return `延長${period - periodCount}`;
}

function timeoutClock(period: number | null, elapsedMs: number | null, periodCount: number) {
  if (period === null || elapsedMs === null) return "時刻未記録";
  return `${periodLabel(period, periodCount)} ${formatClock(elapsedMs)}`;
}

export function MatchRecordSummary({ events, homeName, awayName, periodCount }: MatchRecordSummaryProps) {
  const summary = deriveMatchRecordSummary(events);
  const hasTimeouts = summary.teamTimeouts.home.length > 0 || summary.teamTimeouts.away.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>選手別サマリー</CardTitle>
        <CardDescription>
          得点・7m・警告・2分間退場・失格を、試合中に保存されたスナップショットから集計します。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {summary.participants.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {summary.participants.map((participant) => {
              const key = participant.subjectMatchRosterId
                ?? participant.subjectTeamMemberId
                ?? `${participant.subjectSide}-${participant.shirtNumber ?? "x"}-${participant.displayName ?? "x"}`;
              return (
                <article key={key} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {sideName(participant.subjectSide, homeName, awayName)}
                      </p>
                      <h3 className="mt-1 truncate text-lg font-black">
                        {participantName(participant.shirtNumber, participant.displayName)}
                      </h3>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
                      {participant.goals}得点
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <div className="rounded-xl bg-muted/60 px-3 py-2 font-semibold">7m {participant.sevenMeterGoals}/{participant.sevenMeterAttempts}</div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2 font-semibold">警告 {participant.warnings}</div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2 font-semibold">2分 {participant.suspensions}</div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2 font-semibold">失格 {participant.disqualifications}</div>
                  </div>

                  {participant.goalTimesMs.length ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      得点時刻: {participant.goalTimesMs.map(formatClock).join(" · ")}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            選手別に集計できる記録はまだありません。
          </p>
        )}

        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-black">チームタイムアウト</h3>
          {hasTimeouts ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(["home", "away"] as const).map((side) => {
                const timeouts = summary.teamTimeouts[side];
                if (!timeouts.length) return null;
                return (
                  <div key={side} className="rounded-xl bg-muted/60 px-4 py-3">
                    <p className="text-sm font-bold">
                      {side === "home" ? homeName : awayName} TTO
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {timeouts.map((timeout) => timeoutClock(timeout.period, timeout.periodElapsedMs, periodCount)).join(" · ")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">チームタイムアウトの記録はありません。</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
