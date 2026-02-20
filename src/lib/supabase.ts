import { createClient, SupabaseClient } from "@supabase/supabase-js";

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Lazy singleton — only created when first accessed at runtime
let _supabase: SupabaseClient | null = null;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = getSupabaseClient();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabase as any)[prop];
  },
});
