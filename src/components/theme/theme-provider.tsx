"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Telas públicas sempre seguem o tema do computador, sem opção de troca. */
const SYSTEM_ONLY_PATHS = ["/", "/login", "/cadastro", "/onboarding"];

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useSystemTheme() {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(QUERY).matches ? "dark" : "light"),
    () => undefined,
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const systemTheme = useSystemTheme();
  const systemOnly = SYSTEM_ONLY_PATHS.includes(pathname);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Chave nova: descarta escolhas antigas salvas como "light", que prendiam o site no claro.
      storageKey="ee-theme"
      forcedTheme={systemOnly ? systemTheme : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
