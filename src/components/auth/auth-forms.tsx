"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { readApiJson } from "@/lib/client-response";
import { getPublicEnvErrorMessage } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { safeInternalPath } from "@/lib/safe-redirect";
import { cn } from "@/lib/utils";

function passwordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  return checks.filter(Boolean).length * 25;
}

function publicAuthMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("invalid")) return "E-mail ou senha invalidos.";
  if (normalized.includes("rate") || normalized.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (normalized.includes("email")) return "Confira seu e-mail e tente novamente.";

  return "Nao foi possivel concluir a autenticacao. Tente novamente em instantes.";
}

type FormStatus = {
  type: "success" | "error";
  title: string;
  message: string;
};

type SignUpResponse = {
  status?: "signed_in" | "email_confirmation_required" | "created_login_required";
  message?: string;
  redirectTo?: string;
  error?: string;
};

type ProfileResponse = {
  profile?: {
    onboardingDone: boolean;
  };
  error?: string;
};

/** Mensagens que as rotas /auth/callback e /auth/confirm colocam na URL do login. */
const KNOWN_AUTH_MESSAGES = new Set([
  "Conta confirmada, mas nao foi possivel carregar seu perfil.",
  "E-mail confirmado. Entre para continuar.",
  "Link de autenticacao invalido ou expirado.",
  "Link de confirmacao invalido.",
  "Nao foi possivel concluir a autenticacao.",
  "Nao foi possivel confirmar seu e-mail.",
  "Nao foi possivel confirmar sua sessao. Tente entrar novamente.",
  "Sessao nao encontrada apos confirmacao.",
]);

const authInput =
  "h-12 w-full rounded-xl border border-border bg-surface-muted px-4 text-[15px] text-ink placeholder:text-ink-muted/70 transition-colors focus-visible:border-brand focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus-ring disabled:opacity-60";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus | null>(null);
  const strength = passwordStrength(password);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const envError = getPublicEnvErrorMessage();
    if (envError) {
      setStatus({ type: "error", title: "Autenticação não configurada", message: envError });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (strength < 50) {
      setStatus({
        type: "error",
        title: "Senha fraca",
        message: "Use pelo menos 8 caracteres e misture letras, numeros e simbolos.",
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await readApiJson<SignUpResponse>(
        response,
        "Falha desconhecida ao criar conta.",
      );

      if (!response.ok) {
        const message = data.error ?? "Falha desconhecida ao criar conta.";
        setStatus({
          type: "error",
          title: response.status === 429 ? "Muitas tentativas" : "Cadastro não concluído",
          message,
        });
        toast.error(data.error ?? "Falha desconhecida ao criar conta.");
        return;
      }

      if (data.status === "email_confirmation_required" || data.status === "created_login_required") {
        const message = data.message ?? "Conta criada. Verifique seu e-mail para confirmar o cadastro.";
        setStatus({ type: "success", title: "Confirme seu e-mail", message });
        toast.success(message);
        if (data.redirectTo) {
          router.push(data.redirectTo);
        }
        return;
      }

      toast.success(data.message ?? "Conta criada com sucesso.");
      router.push(data.redirectTo ?? "/onboarding");
      router.refresh();
    } catch {
      const message = "Não foi possível falar com o servidor de autenticação.";
      setStatus({ type: "error", title: "Erro de rede", message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const envError = getPublicEnvErrorMessage();
    if (envError) {
      setStatus({ type: "error", title: "Autenticação não configurada", message: envError });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      const message = publicAuthMessage(error.message);
      setStatus({ type: "error", title: "Google indisponivel", message });
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status ? (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-ink">Nome</label>
        <input id="name" name="name" required autoComplete="name" placeholder="Seu nome" disabled={loading} className={authInput} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">E-mail</label>
        <input id="email" name="email" required type="email" autoComplete="email" placeholder="voce@exemplo.com" disabled={loading} className={authInput} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">Senha</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            placeholder="Crie uma senha"
            value={password}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(authInput, "pr-24")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[13px] font-medium text-brand-strong hover:underline"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
          <div className={cn("h-full rounded-full transition-all", strength >= 75 ? "bg-success" : strength >= 50 ? "bg-brand" : "bg-warning")} style={{ width: `${strength}%` }} />
        </div>
        <p className="m-0 text-xs text-ink-muted">Use 8 caracteres ou mais, com letras, números e símbolos.</p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60 dark:bg-[#2563eb] dark:text-white dark:hover:bg-[#1d4ed8]"
      >
        {loading ? "Criando..." : "Criar conta"}
      </button>
      <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-[0.08em] text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-[15px] font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60"
      >
        <GoogleIcon />
        Entrar com Google
      </button>
      <p className="m-0 text-center text-sm text-ink-muted">
        Já tem conta?{" "}
        <Link className="font-semibold text-brand-strong underline underline-offset-2" href="/login">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Só mostra mensagens que o próprio site manda pela URL; um link de terceiros não escreve texto na tela.
  const rawMessage = params.get("auth_error") ?? params.get("message");
  const initialMessage = rawMessage && KNOWN_AUTH_MESSAGES.has(rawMessage) ? rawMessage : rawMessage ? "Não foi possível concluir a autenticação. Tente entrar novamente." : null;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<FormStatus | null>(
    initialMessage
      ? {
          type: params.get("auth_error") ? "error" : "success",
          title: params.get("auth_error") ? "Autenticação incompleta" : "Aviso",
          message: initialMessage,
        }
      : null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const envError = getPublicEnvErrorMessage();
    if (envError) {
      setStatus({ type: "error", title: "Autenticação não configurada", message: envError });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    setLoading(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const message = publicAuthMessage(error.message);
      setStatus({ type: "error", title: "Login não concluído", message });
      toast.error(message);
      setLoading(false);
      return;
    }

    const profileResponse = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const profileData = await readApiJson<ProfileResponse>(
      profileResponse,
      "Login feito, mas não foi possivel preparar seu perfil.",
    );

    if (!profileResponse.ok) {
      const message = profileData.error ?? "Login feito, mas não foi possivel preparar seu perfil.";
      setStatus({ type: "error", title: "Perfil indisponivel", message });
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Login realizado.");
    router.push(safeInternalPath(params.get("next"), profileData.profile?.onboardingDone ? "/dashboard" : "/onboarding"));
    router.refresh();
  }

  async function handleReset() {
    const envError = getPublicEnvErrorMessage();
    if (envError) {
      setStatus({ type: "error", title: "Autenticação não configurada", message: envError });
      return;
    }

    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const email = emailInput?.value.trim() ?? "";
    if (!email) {
      const message = "Informe o e-mail para recuperar a senha.";
      setStatus({ type: "error", title: "E-mail obrigatorio", message });
      toast.error(message);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    const message = error ? publicAuthMessage(error.message) : "E-mail de recuperacao enviado.";
    setStatus({ type: error ? "error" : "success", title: error ? "Falha ao recuperar senha" : "Verifique seu e-mail", message });
    toast[error ? "error" : "success"](message);
  }

  async function handleGoogle() {
    const envError = getPublicEnvErrorMessage();
    if (envError) {
      setStatus({ type: "error", title: "Autenticação não configurada", message: envError });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      const message = publicAuthMessage(error.message);
      setStatus({ type: "error", title: "Google indisponivel", message });
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status ? (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-ink">E-mail</label>
        <input id="email" name="email" required type="email" autoComplete="email" placeholder="voce@exemplo.com" disabled={loading} className={authInput} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-ink">Senha</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={loading}
            className={cn(authInput, "pr-24")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[13px] font-medium text-brand-strong hover:underline"
          >
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </div>
        <div className="flex justify-end">
          <button onClick={handleReset} className="text-[13px] font-medium text-brand-strong hover:underline" type="button" disabled={loading}>
            Esqueceu a senha?
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:opacity-60 dark:bg-[#2563eb] dark:text-white dark:hover:bg-[#1d4ed8]"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-[0.08em] text-ink-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface text-[15px] font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60"
      >
        <GoogleIcon />
        Entrar com Google
      </button>
      <p className="m-0 text-center text-sm text-ink-muted">
        Ainda não tem conta?{" "}
        <Link className="font-semibold text-brand-strong underline underline-offset-2" href="/cadastro">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
