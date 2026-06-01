"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="Alternar tema"
      title="Alternar tema"
      suppressHydrationWarning
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex h-8 w-16 items-center rounded-full border border-[#CBD5E1] bg-[#F1F5F9] p-1 text-[#64748B] shadow-inner transition-colors hover:border-[#4F46E5]/40 dark:border-[#1A2744] dark:bg-[#131D35] dark:text-[#94A3B8]"
    >
      <Sun className="absolute left-2 size-3.5 text-[#F59E0B]" />
      <Moon className="absolute right-2 size-3.5 text-[#818CF8]" />
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#F59E0B] shadow-sm transition-transform dark:translate-x-8 dark:bg-[#070A13] dark:text-[#818CF8]">
        <Sun className="size-3.5 dark:hidden" />
        <Moon className="hidden size-3.5 dark:block" />
      </span>
    </button>
  );
}
