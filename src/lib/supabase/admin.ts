import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig, getSupabaseServiceRoleKey } from "@/lib/env";

export function createSupabaseAdminClient() {
  const config = getPublicSupabaseConfig();

  return createClient(config.url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
