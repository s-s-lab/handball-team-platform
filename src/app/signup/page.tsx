import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { Brand } from "@/components/site/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SignupPageProps = { searchParams: Promise<{ error?: string }> };

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Brand /></div>
        <Card>
          <CardHeader>
            <CardTitle>アカウントを作成</CardTitle>
            <CardDescription>まずサービスのユーザーアカウントを作成します。チーム作成はログイン後に行います。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signup}>
              <FieldGroup>
                {params.error ? <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{params.error}</div> : null}
                <Field>
                  <FieldLabel htmlFor="email">メールアドレス</FieldLabel>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">パスワード</FieldLabel>
                  <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                  <FieldDescription>8文字以上で設定してください。</FieldDescription>
                </Field>
                <Button type="submit" size="lg" className="w-full">無料で始める</Button>
                <FieldDescription className="text-center">すでにアカウントをお持ちの方は <Link className="font-semibold text-foreground underline underline-offset-4" href="/login">ログイン</Link></FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
