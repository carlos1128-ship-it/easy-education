import { NextResponse } from "next/server";
import { getPublicEnvErrorMessage, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      response: NextResponse.json(
        { error: getPublicEnvErrorMessage() ?? "Autenticacao indisponivel." },
        { status: 503 },
      ),
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Sessao invalida." }, { status: 401 }),
    };
  }

  return { user, response: null };
}
