"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const option = (active: boolean) =>
    cn(
      "grid size-7 place-items-center rounded-full transition-colors",
      active ? "bg-surface text-brand-strong shadow-card" : "text-ink-muted hover:text-ink",
    );

  return (
    <div
      role="group"
      aria-label="Tema"
      suppressHydrationWarning
      className={cn("flex h-9 items-center gap-0.5 rounded-full border border-border bg-surface-muted p-[3px]", className)}
    >
      <button
        type="button"
        aria-label="Tema claro"
        aria-pressed={!isDark}
        suppressHydrationWarning
        onClick={() => setTheme("light")}
        className={option(!isDark)}
      >
        <Sun className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Tema escuro"
        aria-pressed={isDark}
        suppressHydrationWarning
        onClick={() => setTheme("dark")}
        className={option(isDark)}
      >
        <Moon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
