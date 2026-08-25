import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/site/brand";
import { PublicLiveViewer } from "@/components/public-live/public-live-viewer";
import { Button } from "@/components/ui/button";
import { getPublicLiveMatch } from "@/features/public-live/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LIVE | Handball Team Platform",
  description: "公開中のハンドボール試合をリアルタイムで確認できます。",
};

type PublicLivePageProps = {
  params: Promise<{ matchId: string }>;
};

export default async function PublicLivePage({ params }: PublicLivePageProps) {
  const { matchId } = await params;
  const match = await getPublicLiveMatch(matchId);
  if (!match) notFound();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="メインナビゲーション">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">トップへ</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">ログイン</Link>
            </Button>
          </nav>
        </div>
      </header>

      <PublicLiveViewer initialMatch={match} />
    </main>
  );
}
