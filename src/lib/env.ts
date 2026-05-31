type PublicSupabaseConfig = {
  url: string;
  key: string;
  appUrl: string;
  isConfigured: boolean;
  missing: string[];
};

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  return [
    "sua_",
    "seu-",
    "YOUR_",
    "your_",
    "example",
  ].some((marker) => value.includes(marker));
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const missing: string[] = [];

  if (!url || isPlaceholder(url) || !url.startsWith("https://")) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!key || isPlaceholder(key)) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return {
    url,
    key,
    appUrl,
    isConfigured: missing.length === 0,
    missing,
  };
}

export function isSupabaseConfigured() {
  return getPublicSupabaseConfig().isConfigured;
}

export function getAuthRedirectUrl(path = "/auth/callback") {
  const { appUrl } = getPublicSupabaseConfig();
  return `${appUrl.replace(/\/$/, "")}${path}`;
}

export function getPublicEnvErrorMessage() {
  const config = getPublicSupabaseConfig();
  if (config.isConfigured) return null;

  if (process.env.NODE_ENV === "production") {
    return "Autenticacao temporariamente indisponivel.";
  }

  return `Autenticacao nao configurada. Preencha ${config.missing.join(
    " e ",
  )} no .env.local e reinicie o servidor.`;
}

export function getSupabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function isSupabaseServiceRoleConfigured() {
  const key = getSupabaseServiceRoleKey();
  return Boolean(key && !isPlaceholder(key));
}
