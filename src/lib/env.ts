type PublicEnvSource = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  [key: string]: string | undefined;
};

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function inlinePublicEnvSource(): PublicEnvSource {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function getPublicEnv(source?: PublicEnvSource): PublicEnv {
  const resolvedSource = source ?? inlinePublicEnvSource();
  const supabaseUrl = resolvedSource.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabasePublishableKey = resolvedSource.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required.");
  }

  if (!supabasePublishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.");
  }

  return { supabaseUrl, supabasePublishableKey };
}
