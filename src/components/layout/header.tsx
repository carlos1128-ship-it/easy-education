"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, Search, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { StatsChips } from "@/components/gamification/stats-chips";
import type { Gamification } from "@/lib/gamification";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { startProductTour } from "@/components/onboarding/product-tour";
import { MobileSidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getProfileInitials } from "@/lib/subjects";

export function Header({ profileName, studyGoal, stats }: { profileName: string; studyGoal?: string; stats?: Gamification }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const initials = getProfileInitials(profileName).toUpperCase();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/dashboard/busca?q=${encodeURIComponent(value)}`);
  }

  return (
    <header className="z-10 flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-border bg-surface px-4 lg:h-16 lg:gap-3 lg:px-8">
      {/* Celular: menu completo + logo, busca e avatar */}
      <div className="-ml-2 lg:hidden">
        <MobileSidebar profileName={profileName} studyGoal={studyGoal} />
      </div>
      <Link href="/dashboard" prefetch={false} className="flex min-w-0 flex-1 no-underline lg:hidden">
        {/* Com ofensiva e nível no topo, o celular mostra só o símbolo (cabe tudo em 320 px). */}
        <Logo size="sm" variant={stats ? "symbol" : "horizontal"} />
      </Link>
      {/* Ofensiva e nível sempre à vista; no celular ficam no lugar da busca. */}
      {stats ? <StatsChips stats={stats} className="lg:hidden" /> : null}
      <Link
        href="/dashboard/busca"
        prefetch={false}
        aria-label="Buscar"
        className={stats ? "hidden" : "grid size-11 place-items-center rounded-lg text-ink-muted transition-colors hover:text-ink lg:hidden"}
      >
        <Search size={20} strokeWidth={1.75} aria-hidden="true" />
      </Link>

      {/* Desktop */}
      <form onSubmit={submit} role="search" className="hidden h-10 max-w-[440px] flex-1 items-center gap-2.5 rounded-lg bg-surface-muted px-3.5 text-ink-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring lg:flex">
        <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar estudos, arquivos ou quizzes…"
          aria-label="Buscar estudos, arquivos ou quizzes"
          className="h-full w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
      </form>
      <div className="hidden flex-1 lg:block" />
      {stats ? <StatsChips stats={stats} className="hidden lg:flex" /> : null}
      <Link
        href="/dashboard/chat"
        prefetch={false}
        className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-tint px-3 text-sm font-medium text-brand-strong no-underline transition-colors hover:bg-brand-soft lg:flex"
      >
        <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
        IA
      </Link>
      <ThemeToggle className="hidden lg:flex" />
      <button
        type="button"
        onClick={startProductTour}
        aria-label="Ver o tutorial do app"
        title="Tutorial: para que serve cada parte"
        className="hidden size-9 flex-shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:grid"
      >
        <CircleHelp size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span data-tour="notificacoes" className="inline-flex">
        <NotificationsBell />
      </span>
      <Link
        href="/dashboard/configuracoes"
        prefetch={false}
        className="grid size-9 flex-shrink-0 place-items-center rounded-full bg-brand text-[13px] font-bold text-on-brand no-underline"
        aria-label="Configurações"
        data-tour="/dashboard/configuracoes"
      >
        {initials}
      </Link>
    </header>
  );
}
