import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getAuthRedirectUrl,
  getPublicEnvErrorMessage,
  isSupabaseConfigured,
  isSupabaseServiceRoleConfigured,
} from "@/lib/env";
import { devWarn } from "@/lib/dev-log";
import { ensureProfileForUser } from "@/lib/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validators";

function getSignupErrorMessage(message: string, status?: number) {
  if (status === 429) {
    return "O servico de autenticacao recusou novas tentativas por limite temporario. Tente novamente em alguns minutos.";
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Muitas tentativas de cadastro em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  if (normalized.includes("already") || normalized.includes("registered")) {
    return "Este e-mail ja esta cadastrado. Tente fazer login ou recuperar sua senha.";
  }

  if (normalized.includes("password")) {
    return "Senha fraca. Use pelo menos 8 caracteres e misture letras, numeros e simbolos.";
  }

  if (normalized.includes("email")) {
    return "E-mail invalido. Confira o endereco e tente novamente.";
  }

  return "Nao foi possivel criar sua conta agora. Tente novamente em instantes.";
}

function devDebug(message: string) {
  return process.env.NODE_ENV === "development" ? message : undefined;
}

function isAlreadyRegistered(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists");
}

async function createAccountWithAdmin(payload: { name: string; email: string; password: string }) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { name: payload.name },
  });

  if (error) {
    devWarn("Supabase Admin retornou erro no createUser.", {
      status: error.status ?? null,
      name: error.name,
    });

    return {
      data: null,
      error,
    };
  }

  return { data, error: null };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    const message = getPublicEnvErrorMessage() ?? "Autenticacao indisponivel.";
    devWarn("Signup bloqueado por env Supabase ausente ou placeholder.");
    return NextResponse.json({ error: message }, { status: 503 });
  }

  try {
    const payload = signUpSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();

    if (isSupabaseServiceRoleConfigured()) {
      const { data: adminData, error: adminError } = await createAccountWithAdmin(payload);

      if (adminError) {
        if (isAlreadyRegistered(adminError.message)) {
          const { error: existingSignInError } = await supabase.auth.signInWithPassword({
            email: payload.email,
            password: payload.password,
          });

          if (!existingSignInError) {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (user) {
              await ensureProfileForUser(user, payload.name);
              return NextResponse.json({
                status: "signed_in",
                message: "Conta encontrada. Perfil preparado com sucesso.",
                redirectTo: "/onboarding",
              });
            }
          }
        }

        return NextResponse.json(
          {
            error: getSignupErrorMessage(adminError.message, adminError.status),
            debugMessage: devDebug(adminError.message),
          },
          { status: adminError.status ?? 400 },
        );
      }

      if (!adminData?.user) {
        return NextResponse.json({ error: "Falha desconhecida ao criar conta." }, { status: 502 });
      }

      try {
        await ensureProfileForUser(adminData.user, payload.name);
      } catch (error) {
        devWarn("Falha no upsert de perfil apos admin createUser.", {
          name: error instanceof Error ? error.name : "unknown",
        });
        return NextResponse.json(
          { error: "Conta criada, mas nao foi possivel preparar seu perfil. Tente novamente em instantes." },
          { status: 500 },
        );
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (signInError) {
        devWarn("Conta criada por Admin API, mas login imediato falhou.", {
          status: signInError.status ?? null,
          name: signInError.name,
        });

        return NextResponse.json({
          status: "created_login_required",
          message: "Conta criada com sucesso. Entre com seu e-mail e senha para continuar.",
          redirectTo: "/login",
          debugMessage: devDebug(signInError.message),
        });
      }

      return NextResponse.json({
        status: "signed_in",
        message: "Conta criada com sucesso.",
        redirectTo: "/onboarding",
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: { name: payload.name },
        emailRedirectTo: getAuthRedirectUrl("/auth/callback"),
      },
    });

    if (error) {
      devWarn("Supabase retornou erro no signup.", {
        status: error.status ?? null,
        name: error.name,
      });
      return NextResponse.json(
        {
          error: getSignupErrorMessage(error.message, error.status),
          debugMessage: devDebug(error.message),
        },
        { status: error.status ?? 400 },
      );
    }

    if (!data.user) {
      devWarn("Signup sem usuario na resposta do Supabase.");
      return NextResponse.json({ error: "Falha desconhecida ao criar conta." }, { status: 502 });
    }

    if (data.user.identities?.length === 0) {
      return NextResponse.json(
        { error: "Este e-mail ja esta cadastrado. Tente fazer login ou recuperar sua senha." },
        { status: 409 },
      );
    }

    try {
      await ensureProfileForUser(data.user, payload.name);
    } catch (error) {
      devWarn("Falha no upsert de perfil apos signup.", {
        name: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json(
        { error: "Conta criada, mas nao foi possivel preparar seu perfil. Tente entrar novamente em instantes." },
        { status: 500 },
      );
    }

    if (!data.session) {
      return NextResponse.json({
        status: "email_confirmation_required",
        message: "Conta criada. Verifique seu e-mail para confirmar o cadastro.",
      });
    }

    return NextResponse.json({
      status: "signed_in",
      message: "Conta criada com sucesso.",
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Dados invalidos." }, { status: 400 });
    }

    devWarn("Falha desconhecida no signup.", {
      name: error instanceof Error ? error.name : "unknown",
    });

    return NextResponse.json({ error: "Falha desconhecida ao criar conta." }, { status: 500 });
  }
}
