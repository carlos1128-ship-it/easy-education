import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { devWarn } from "@/lib/dev-log";
import { ensureProfileForUser } from "@/lib/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPrisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirectTo = request.nextUrl.clone();

  if (!tokenHash || !type) {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("auth_error", "Link de confirmacao invalido.");
    return NextResponse.redirect(redirectTo);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    devWarn("Falha ao confirmar token_hash.", { status: error.status ?? null, name: error.name });
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("auth_error", "Nao foi possivel confirmar seu e-mail.");
    return NextResponse.redirect(redirectTo);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfileForUser(user);
    const profile = await getPrisma().profile.findUnique({ where: { userId: user.id } });
    redirectTo.pathname = profile?.onboardingDone ? "/dashboard" : "/onboarding";
  } else {
    redirectTo.pathname = "/login";
    redirectTo.searchParams.set("message", "E-mail confirmado. Entre para continuar.");
  }

  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  return NextResponse.redirect(redirectTo);
}
