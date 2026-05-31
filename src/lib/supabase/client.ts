import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseConfig } from "@/lib/env";

export function createClient() {
  const config = getPublicSupabaseConfig();
  return createBrowserClient(config.url, config.key);
}
