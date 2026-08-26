import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyOrganizations, listMyTeams } from "@/features/team-core/data";

export default async function AppHomePage() {
  const [organizations, teams] = await Promise.all([
    listMyOrganizations(),
    listMyTeams(),
  ]);

  const hasOrganizations = organizations.length > 0;

  return (
    <main className="space-y-10">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
          <div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--workspace-accent)]">
              <Sparkles className="size-4" aria-hidden="true" />
              Handball team workspace
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-foreground sm:text-5xl">
              チームを選ぶ
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              予定、メンバー、試合、シーズン成績まで。日々のチーム運営をひとつのワークスペースから始めます。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/app/organizations/new">
                  <Plus aria-hidden="true" /> 新しい組織を作る
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-between border-t border-white/10 bg-[var(--workspace-ink)] p-7 text-white lg:border-t-0 lg:border-l lg:p-9">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/40">Your workspace</p>
              <p className="mt-5 text-5xl font-black tabular-nums tracking-[-0.05em]">{teams.length}</p>
              <p className="mt-1 text-sm font-semibold text-white/65">所属チーム</p>
            </div>
            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
              <div>
                <p className="text-2xl font-black tabular-nums">{organizations.length}</p>
                <p className="mt-1 text-xs font-semibold text-white/45">所属組織</p>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[var(--workspace-highlight)]">
                <UsersRound className="size-6" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {!hasOrganizations ? (
        <section className="rounded-[2rem] border border-border bg-[var(--workspace-ink)] p-7 text-white sm:p-9">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--workspace-highlight)]">First setup</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">最初のチームをつくる準備</h2>
            <p className="mt-3 text-sm leading-7 text-white/60">
              まずクラブ・学校・運営団体などの組織を作成します。その中にチームを追加すると、メンバーや試合の管理を始められます。
            </p>
            <Button asChild size="lg" className="mt-6 bg-white text-[var(--workspace-ink)] hover:bg-white/90">
              <Link href="/app/organizations/new">
                組織を作成 <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="teams-heading">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--workspace-accent)]">Teams</p>
                <h2 id="teams-heading" className="mt-1 text-2xl font-black tracking-tight">あなたのチーム</h2>
              </div>
              <p className="text-sm text-muted-foreground">チームを選んでワークスペースを開く</p>
            </div>

            {teams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {teams.map((team) => (
                  <Link
                    key={team.id}
                    href={`/app/teams/${team.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-[color-mix(in_oklch,var(--workspace-accent)_35%,var(--border))] hover:shadow-[0_16px_42px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--workspace-ink)] text-lg font-black text-white">
                        {team.name.slice(0, 1)}
                      </div>
                      <div className="flex flex-wrap justify-end gap-1.5 text-[10px] font-bold">
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          {team.role === "admin" ? "管理者" : "メンバー"}
                        </span>
                        <span className="rounded-full bg-[color-mix(in_oklch,var(--workspace-success)_12%,white)] px-2.5 py-1 text-[var(--workspace-success)]">
                          {team.isPublic ? "公開" : "非公開"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6">
                      <h3 className="truncate text-xl font-black tracking-tight text-foreground">{team.name}</h3>
                      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">/{team.slug}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm font-bold text-[var(--workspace-accent)]">
                      <span>チームホームへ</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-8">
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold">まだ直接所属しているチームはありません。</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      下の所属組織を開いて、チームを作成してください。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="organizations-heading" className="border-t border-border pt-8">
            <div className="mb-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Organizations</p>
              <h2 id="organizations-heading" className="mt-1 text-xl font-black tracking-tight">所属組織</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {organizations.map((organization) => (
                <Link
                  key={organization.id}
                  href={`/app/organizations/${organization.id}`}
                  className="group flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-border bg-white px-5 py-4 transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <Building2 className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{organization.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {organization.role === "admin" ? "管理者" : "メンバー"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
