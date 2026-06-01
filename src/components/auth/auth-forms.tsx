"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Globe } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { readApiJson } from "@/lib/client-response";
import { getPublicEnvErrorMessage } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

function passwordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  return checks.filter(Boolean).length * 25;
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
  debugMessage?: string;
};

type ProfileResponse = {
  profile?: {
    onboardingDone: boolean;
  };
  error?: string;
};

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
        const message = [data.error, data.debugMessage ? `Detalhe tecnico: ${data.debugMessage}` : null]
          .filter(Boolean)
          .join("\n\n");
        setStatus({
          type: "error",
          title: response.status === 429 ? "Muitas tentativas" : "Cadastro não concluído",
          message: message || "Falha desconhecida ao criar conta.",
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
      setStatus({ type: "error", title: "Google indisponivel", message: error.message });
      toast.error(error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status ? (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" name="name" required placeholder="Seu nome" disabled={loading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" required type="email" placeholder="voce@email.com" disabled={loading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            required
            type={showPassword ? "text" : "password"}
            minLength={8}
            value={password}
            disabled={loading}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            onClick={() => setShowPassword((value) => !value)}
            aria-label="Alternar visibilidade da senha"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Progress value={strength} className="h-2" />
      </div>
      <Button type="submit" className="w-full bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]" disabled={loading}>
        {loading ? "Criando..." : "Criar conta"}
      </Button>
      <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={loading}>
        <Globe className="size-4" />
        Entrar com Google
      </Button>
      <p className="text-center text-sm text-slate-500">
        Ja tenho conta{" "}
        <Link className="text-[#1B4FD8]" href="/login">
          Login
        </Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMessage = params.get("auth_error") ?? params.get("message");
  const [loading, setLoading] = useState(false);
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
      const message = error.message.includes("Invalid")
        ? "E-mail ou senha invalidos."
        : error.message;
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
    router.push(params.get("next") ?? (profileData.profile?.onboardingDone ? "/dashboard" : "/onboarding"));
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
    const message = error?.message ?? "E-mail de recuperacao enviado.";
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
      setStatus({ type: "error", title: "Google indisponivel", message: error.message });
      toast.error(error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status ? (
        <Alert variant={status.type === "error" ? "destructive" : "default"}>
          {status.type === "error" ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <AlertTitle>{status.title}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" required type="email" placeholder="voce@email.com" disabled={loading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" required type="password" disabled={loading} />
      </div>
      <Button type="submit" className="w-full bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={loading}>
        <Globe className="size-4" />
        Entrar com Google
      </Button>
      <button onClick={handleReset} className="w-full text-sm text-[#1B4FD8]" type="button" disabled={loading}>
        Esqueci minha senha
      </button>
      <p className="text-center text-sm text-slate-500">
        Ainda não tenho conta{" "}
        <Link className="text-[#1B4FD8]" href="/cadastro">
          Cadastro
        </Link>
      </p>
    </form>
  );
}
