import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

export function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  return createSupabaseClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
