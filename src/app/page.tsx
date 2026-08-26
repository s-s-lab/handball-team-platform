import Link from "next/link";
import { ArrowRight, Radio, ShieldCheck, TimerReset } from "lucide-react";
import { PortalMatchSections } from "@/components/public-portal/portal-match-sections";
import { TeamSearch } from "@/components/public-portal/team-search";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { getPublicPortalMatches, searchPublicTeams } from "@/features/public-portal/data";

const principles = [
  {
    icon: TimerReset,
    title: "試合中に迷わない",
    text: "タイマーとスコアを、体育館で素早く扱える操作性へ。",
  },
  {
    icon: Radio,
    title: "試合をそのまま共有",
    text: "記録した試合状態をLIVE表示や結果公開へつなげます。",
  },
  {
    icon: ShieldCheck,
    title: "公開範囲をコントロール",
    text: "チーム情報と個人情報を分け、安全な公開を前提に設計します。",
  },
];

type HomePageProps = {
  searchParams: Promise<{ team_q?: string | string[] }>;
};

function normalizeTeamQuery(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return raw.trim().slice(0, 100);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = normalizeTeamQuery(params.team_q);

  const matchesPromise = getPublicPortalMatches();
  const teamsPromise = query ? searchPublicTeams(query) : Promise.resolve([]);
  const [matches, teams] = await Promise.all([matchesPromise, teamsPromise]);

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

      <section className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.04em] md:text-6xl">
              ハンドボールチームに必要なものを、ひとつに。
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-muted-foreground md:text-lg">
              チーム運営、試合管理、タイマー、スコア、LIVE公開まで。試合前から試合後までを一つの流れで扱える、ハンドボール専用プラットフォームです。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  チーム運営を始める
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">ログイン</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16" aria-labelledby="public-matches-title">
        <div className="mb-7 max-w-2xl">
          <h2 id="public-matches-title" className="text-2xl font-black tracking-tight md:text-3xl">
            公開試合
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
            LIVEスコア、今後の試合、最近の結果をログインなしで確認できます。
          </p>
        </div>
        <PortalMatchSections matches={matches} />
      </section>

      <section className="border-y border-border bg-muted/30" aria-labelledby="team-search-title">
        <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
          <div className="mb-6 max-w-2xl">
            <h2 id="team-search-title" className="text-2xl font-black tracking-tight md:text-3xl">
              チームを探す
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">
              公開されているチームを、チーム名・略称から検索できます。
            </p>
          </div>
          <TeamSearch query={query} results={teams} submitted={Boolean(query)} />
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-14 md:grid-cols-3 md:px-8">
          {principles.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 py-5 first:pl-0 last:pr-0 md:px-6">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-bold">{title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
