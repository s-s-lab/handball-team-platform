import { buildRecordTimeline } from "@/features/match-records/presentation";
import type { RecordEvent, TeamSide } from "@/features/match-records/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MatchRecordTimelineProps = {
  events: RecordEvent[];
  homeName: string;
  awayName: string;
  periodCount: number;
};

function sideName(side: TeamSide | null, homeName: string, awayName: string) {
  if (side === "home") return homeName;
  if (side === "away") return awayName;
  return null;
}

export function MatchRecordTimeline({ events, homeName, awayName, periodCount }: MatchRecordTimelineProps) {
  const timeline = buildRecordTimeline(events, periodCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>タイムライン</CardTitle>
        <CardDescription>
          得点・7m・警告・2分間退場・失格・TTOを公式経過時刻で振り返れます。訂正履歴も残ります。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.length ? (
          <ol className="relative flex flex-col gap-3 border-l border-border pl-5">
            {timeline.map((item) => {
              const team = sideName(item.side, homeName, awayName);
              return (
                <li key={item.eventId} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[1.45rem] top-4 size-2.5 rounded-full border-2 border-background bg-primary"
                  />
                  <article
                    className={[
                      "rounded-2xl border border-border bg-background p-4",
                      item.reverted ? "opacity-60" : "",
                      item.correction ? "border-dashed bg-muted/35" : "",
                    ].join(" ")}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold tabular-nums text-muted-foreground">{item.clock}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <h3 className={item.reverted ? "font-black line-through" : "font-black"}>{item.label}</h3>
                          {item.reverted ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                              訂正済み
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {team ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          {team}
                        </span>
                      ) : null}
                    </div>

                    {item.subject ? <p className="mt-2 text-sm font-semibold">{item.subject}</p> : null}
                    {item.correction && item.reason ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">理由: {item.reason}</p>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
            まだ試合記録はありません。MATCH CONSOLEで得点・7m・罰則・TTOを記録すると、ここに時系列で表示されます。
          </div>
        )}
      </CardContent>
    </Card>
  );
}
