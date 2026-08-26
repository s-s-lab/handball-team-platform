import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PublicMatchList } from "@/components/public-live/public-match-list";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { getPublicTeamMatches } from "@/features/public-live/data";
import { getPublicTeamBySlug, getPublicTeamMembers } from "@/features/team-core/public-data";

type PublicTeamPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicTeamPage({ params }: PublicTeamPageProps) {
  const { slug } = await params;
  const team = await getPublicTeamBySlug(slug);
  if (!team) notFound();

  const [members, matches] = await Promise.all([
    getPublicTeamMembers(team.id),
    getPublicTeamMatches(team.id),
  ]);
  const players = members.filter((member) => member.kind === "player");
  const staff = members.filter((member) => member.kind === "staff");

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 md:px-8">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="メインナビゲーション">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">ログイン</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">無料で始める</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-16">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden="true" />
            公開チームページ
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{team.name}</h1>
          {team.shortName ? <p className="mt-2 font-semibold text-muted-foreground">{team.shortName}</p> : null}
          {team.description ? (
            <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {team.description}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pt-10 md:px-8 md:pt-14">
        <div className="mb-7">
          <h2 className="text-2xl font-black tracking-tight">試合</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            公開設定された試合のLIVEスコア、今後の予定、最近の結果を確認できます。
          </p>
        </div>
        <PublicMatchList matches={matches} />
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
        <div className="mb-7">
          <h2 className="text-2xl font-black tracking-tight">ロスター</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            チームと本人側で公開設定された情報のみ表示しています。
          </p>
        </div>

        {members.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            現在公開されている選手・スタッフ情報はありません。
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {players.length > 0 ? (
              <section>
                <h3 className="mb-3 text-sm font-bold text-muted-foreground">選手</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {players.map((member) => (
                    <article key={member.id} className="rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-start gap-4">
                        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground">
                          {member.shirtNumber ?? "–"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground">{member.displayName}</h4>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {member.primaryPosition ?? "PLAYER"}
                          </p>
                          {member.gradeOrAge ? (
                            <p className="mt-2 text-xs text-muted-foreground">{member.gradeOrAge}</p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {staff.length > 0 ? (
              <section>
                <h3 className="mb-3 text-sm font-bold text-muted-foreground">スタッフ</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {staff.map((member) => (
                    <article key={member.id} className="rounded-2xl border border-border bg-card p-5">
                      <h4 className="font-bold text-foreground">{member.displayName}</h4>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">STAFF</p>
                      {member.gradeOrAge ? (
                        <p className="mt-2 text-xs text-muted-foreground">{member.gradeOrAge}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
