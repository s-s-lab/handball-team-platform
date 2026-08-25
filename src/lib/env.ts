type PublicEnvSource = Partial<Record<"NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", string | undefined>>;

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export function getPublicEnv(source: PublicEnvSource = process.env): PublicEnv {
  const supabaseUrl = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  if (!supabasePublishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.");
  }

  return { supabaseUrl, supabasePublishableKey };
}
