import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Pencil, ShieldCheck, ShieldOff, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MemberProfileData } from "@/features/member-directory/data";

function formatJapanDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "finished") return "終了";
  if (status === "live") return "LIVE";
  if (status === "cancelled") return "中止";
  return "予定";
}

export function MemberProfile({ profile }: { profile: MemberProfileData }) {
  const { team, member, role, appearances } = profile;
  const isAdmin = role === "admin";
  const roleLabel = member.kind === "player" ? "PLAYER" : "STAFF";

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href={`/app/teams/${team.id}/members`}>
          <ArrowLeft aria-hidden="true" /> メンバーへ戻る
        </Link>
      </Button>

      <section className="relative overflow-hidden bg-[var(--workspace-ink)] text-white">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(120deg,transparent,var(--workspace-accent-soft))] opacity-30" aria-hidden="true" />
        <div className="relative grid md:grid-cols-[12rem_1fr]">
          <div className="grid min-h-44 place-items-center border-b border-white/10 bg-white/[0.04] md:min-h-64 md:border-b-0 md:border-r">
            {member.kind === "player" ? (
              <span className="text-7xl font-black tabular-nums tracking-[-0.08em] md:text-8xl">{member.shirtNumber ?? "–"}</span>
            ) : (
              <UserRound className="size-20 text-white/70" aria-hidden="true" />
            )}
          </div>

          <div className="flex flex-col justify-between gap-8 p-6 md:p-9">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-black tracking-[0.16em] text-white/60">
                <span>{roleLabel}</span>
                <span aria-hidden="true">/</span>
                <span>{member.isActive ? "ACTIVE" : "INACTIVE"}</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">{member.fullName}</h1>
              {member.displayName && member.displayName !== member.fullName ? (
                <p className="mt-2 text-base font-bold text-white/65">{member.displayName}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <dl className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <dt className="text-[10px] font-black tracking-[0.18em] text-white/45">POSITION</dt>
                  <dd className="mt-1 text-lg font-black">{member.primaryPosition ?? "–"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-black tracking-[0.18em] text-white/45">CATEGORY</dt>
                  <dd className="mt-1 text-lg font-black">{member.gradeOrAge ?? "–"}</dd>
                </div>
                {isAdmin ? (
                  <div>
                    <dt className="text-[10px] font-black tracking-[0.18em] text-white/45">PUBLIC</dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                      {member.isPublic ? <ShieldCheck className="size-4" aria-hidden="true" /> : <ShieldOff className="size-4" aria-hidden="true" />}
                      {member.isPublic ? "公開中" : "非公開"}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {isAdmin ? (
                <Button asChild variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                  <Link href={`/app/teams/${team.id}/members/${member.id}/edit`}>
                    <Pencil aria-hidden="true" /> プロフィール編集
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="recent-appearances-heading">
        <div className="flex items-end justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">MATCH HISTORY</p>
            <h2 id="recent-appearances-heading" className="mt-1 text-2xl font-black tracking-[-0.03em]">最近の試合</h2>
          </div>
          <span className="text-xs font-bold text-muted-foreground">直近 {appearances.length} 試合</span>
        </div>

        {appearances.length > 0 ? (
          <div className="divide-y divide-border/80">
            {appearances.map((appearance) => (
              <Link
                key={appearance.matchId}
                href={`/app/matches/${appearance.matchId}`}
                className="group grid gap-3 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[8rem_1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-xs font-black text-muted-foreground">{formatJapanDate(appearance.scheduledAt)}</p>
                  <p className="mt-1 text-[10px] font-black tracking-[0.14em] text-[var(--workspace-accent)]">{statusLabel(appearance.status)}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">vs {appearance.opponentName}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{appearance.matchName}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden="true" /> #{appearance.shirtNumber ?? "–"} / {appearance.primaryPosition ?? "–"}</span>
                    {appearance.venue ? <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden="true" /> {appearance.venue}</span> : null}
                  </div>
                </div>
                <ArrowRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="font-black">試合ロスターの記録はまだありません。</p>
            <p className="mt-2 text-sm text-muted-foreground">試合でロスターを確定すると、ここに出場履歴として表示されます。</p>
          </div>
        )}
      </section>

      <section className="border-y border-border/80 py-5">
        <p className="text-xs font-black tracking-[0.16em] text-muted-foreground">SEASON STATS</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">シーズン成績</h2>
            <p className="mt-1 text-sm text-muted-foreground">シーズン別の個人成績は、成績管理機能の実装後にここへ連携します。</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">準備中</span>
        </div>
      </section>
    </div>
  );
}
