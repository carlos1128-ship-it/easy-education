import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const config = getPublicSupabaseConfig();

  return createServerClient(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot set cookies; middleware refreshes them.
          }
        },
      },
    },
  );
}

export const createClient = createServerSupabaseClient;
