import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/35">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Brand href="/app" />
          <nav className="flex items-center gap-2" aria-label="アプリナビゲーション">
            <Button asChild variant="ghost" size="sm"><Link href="/">公開ページ</Link></Button>
            <form action="/auth/signout" method="post"><Button type="submit" variant="outline" size="sm">ログアウト</Button></form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</div>
    </div>
  );
}
