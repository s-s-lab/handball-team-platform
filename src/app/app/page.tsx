import { ArrowRight, CalendarDays, CircleUserRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppHomePage() {
  return (
    <main>
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-muted-foreground">ホーム</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">チーム運営を始めましょう</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">このアカウントにOrganizationとTeamを作成すると、次の試合、最近の結果、MATCH CONSOLEへのクイック操作がここに集約されます。</p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader><CardTitle>最初のチームを準備</CardTitle><CardDescription>組織・チーム作成機能を追加しても、このホーム画面から迷わず開始できる構造にしています。</CardDescription></CardHeader>
          <CardContent>
            <Button disabled size="lg">組織を作成 <ArrowRight data-icon="inline-end" /></Button>
            <p className="mt-3 text-xs text-muted-foreground">チーム作成は次の開発フェーズで有効になります。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>アカウント</CardTitle><CardDescription>認証済みのアプリ領域です。</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3"><CircleUserRound className="size-5" aria-hidden="true" /><span>安全なログインセッション</span></div>
            <div className="flex items-center gap-3"><CalendarDays className="size-5" aria-hidden="true" /><span>試合管理へ拡張可能</span></div>
            <div className="flex items-center gap-3"><Plus className="size-5" aria-hidden="true" /><span>複数チーム所属に対応予定</span></div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
