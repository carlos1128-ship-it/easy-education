import { isSupabaseServiceRoleConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function createStorageServerClient() {
  if (isSupabaseServiceRoleConfigured()) {
    return createSupabaseAdminClient();
  }

  return createServerSupabaseClient();
}
