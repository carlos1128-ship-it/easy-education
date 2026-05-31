import { NextResponse, type NextRequest } from "next/server";
import { devWarn } from "@/lib/dev-log";
import { ensureProfileForUser } from "@/lib/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPrisma } from "@/lib/prisma";

function redirectWithError(request: NextRequest, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("auth_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    devWarn("Callback de Auth recebeu erro do provedor.");
    return redirectWithError(request, "Nao foi possivel concluir a autenticacao.");
  }

  if (!code) {
    return redirectWithError(request, "Link de autenticacao invalido ou expirado.");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    devWarn("Falha ao trocar code por sessao.", { status: error.status ?? null, name: error.name });
    return redirectWithError(request, "Nao foi possivel confirmar sua sessao. Tente entrar novamente.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    devWarn("Callback sem usuario autenticado apos exchange.", {
      status: userError?.status ?? null,
      name: userError?.name ?? null,
    });
    return redirectWithError(request, "Sessao nao encontrada apos confirmacao.");
  }

  try {
    await ensureProfileForUser(user);
  } catch (profileError) {
    devWarn("Falha no upsert de perfil no callback.", {
      name: profileError instanceof Error ? profileError.name : "unknown",
    });
    return redirectWithError(request, "Conta confirmada, mas nao foi possivel carregar seu perfil.");
  }

  const prisma = getPrisma();
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = profile?.onboardingDone ? "/dashboard" : "/onboarding";
  redirectTo.search = "";
  return NextResponse.redirect(redirectTo);
}
