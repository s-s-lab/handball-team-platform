import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckEmailPageProps = { searchParams: Promise<{ email?: string }> };

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const { email } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card>
          <CardHeader>
            <div className="mb-3 grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground"><MailCheck className="size-6" aria-hidden="true" /></div>
            <CardTitle>メールを確認してください</CardTitle>
            <CardDescription>{email ? `${email} に確認メールを送信しました。` : "確認メールを送信しました。"} メール内のリンクから登録を完了してください。</CardDescription>
          </CardHeader>
          <CardContent><Button asChild variant="outline" className="w-full"><Link href="/login">ログイン画面へ</Link></Button></CardContent>
        </Card>
      </div>
    </main>
  );
}
