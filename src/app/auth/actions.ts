"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseCredentials } from "@/features/auth/credentials";
import { safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

function authErrorPath(path: "/login" | "/signup", message: string, next?: string) {
  const params = new URLSearchParams({ error: message });
  if (next) params.set("next", safeNextPath(next));
  return `${path}?${params.toString()}`;
}

export async function login(formData: FormData) {
  const parsed = parseCredentials(formData);
  const next = safeNextPath(formData.get("next") as string | null);

  if (!parsed.ok) redirect(authErrorPath("/login", parsed.message, next));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.value);

  if (error) {
    redirect(authErrorPath("/login", "メールアドレスまたはパスワードを確認してください。", next));
  }

  redirect(next);
}

export async function signup(formData: FormData) {
  const parsed = parseCredentials(formData);
  if (!parsed.ok) redirect(authErrorPath("/signup", parsed.message));

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.value,
    options: origin ? { emailRedirectTo: `${origin}/auth/confirm` } : undefined,
  });

  if (error) {
    redirect(authErrorPath("/signup", "アカウントを作成できませんでした。入力内容を確認してください。"));
  }

  if (data.session) redirect("/app");
  redirect(`/auth/check-email?email=${encodeURIComponent(parsed.value.email)}`);
}
