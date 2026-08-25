import Link from "next/link";
import { ArrowRight, Radio, ShieldCheck, TimerReset } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";

const principles = [
  { icon: TimerReset, title: "試合中に迷わない", text: "タイマーとスコアを、体育館で素早く扱える操作性へ。" },
  { icon: Radio, title: "試合をそのまま共有", text: "記録した試合状態をLIVE表示や結果公開へつなげます。" },
  { icon: ShieldCheck, title: "公開範囲をコントロール", text: "チーム情報と個人情報を分け、安全な公開を前提に設計します。" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-5 md:px-8">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="メインナビゲーション">
            <Button asChild variant="ghost" size="sm"><Link href="/login">ログイン</Link></Button>
            <Button asChild size="sm"><Link href="/signup">無料で始める</Link></Button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_70%_10%,oklch(0.93_0.08_195),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-balance text-4xl font-black leading-[1.08] tracking-[-0.04em] md:text-6xl">
              ハンドボールチームに必要なものを、ひとつに。
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-muted-foreground md:text-lg">
              チーム運営、試合管理、タイマー、スコア、LIVE公開まで。試合前から試合後までを一つの流れで扱える、ハンドボール専用プラットフォームです。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/signup">チーム運営を始める <ArrowRight data-icon="inline-end" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/login">ログイン</Link></Button>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/10 md:p-8">
            <div className="text-sm font-semibold text-primary-foreground/65">MATCH CONSOLE</div>
            <div className="mt-8 text-center">
              <div className="text-sm font-bold text-primary-foreground/70">前半</div>
              <div className="mt-1 font-mono text-6xl font-black tabular-nums tracking-tight md:text-7xl">18:42</div>
              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div><div className="text-xs text-primary-foreground/60">HOME</div><div className="mt-1 text-5xl font-black tabular-nums">12</div></div>
                <div className="text-2xl font-bold text-primary-foreground/40">−</div>
                <div><div className="text-xs text-primary-foreground/60">AWAY</div><div className="mt-1 text-5xl font-black tabular-nums">10</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/45">
        <div className="mx-auto grid max-w-6xl gap-px px-5 py-14 md:grid-cols-3 md:px-8">
          {principles.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4 py-5 md:px-6 first:pl-0 last:pr-0">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" aria-hidden="true" /></div>
              <div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
