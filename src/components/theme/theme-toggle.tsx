"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const options: Array<{ value: "system" | "light" | "dark"; label: string; icon: LucideIcon }> = [
  { value: "system", label: "Tema automático (igual ao computador)", icon: Monitor },
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "dark", label: "Tema escuro", icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "system";

  return (
    <div
      role="group"
      aria-label="Tema"
      suppressHydrationWarning
      className={cn("flex h-9 items-center gap-0.5 rounded-full border border-border bg-surface-muted p-[3px]", className)}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            suppressHydrationWarning
            onClick={() => setTheme(value)}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors",
              active ? "bg-surface text-brand-strong shadow-card" : "text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
