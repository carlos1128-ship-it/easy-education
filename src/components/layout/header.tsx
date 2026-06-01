"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Sparkles } from "lucide-react";
import { MobileSidebar } from "@/components/layout/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getProfileInitials } from "@/lib/subjects";

export function Header({ profileName, studyGoal }: { profileName: string; studyGoal?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value) router.push(`/dashboard/busca?q=${encodeURIComponent(value)}`);
  }

  return (
    <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-6">
      <div className="flex flex-1 items-center gap-4">
        <MobileSidebar profileName={profileName} studyGoal={studyGoal} />
        <form onSubmit={submit} className="relative hidden w-full max-w-md sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar estudos, arquivos ou quizzes..."
            className="w-full rounded-xl border-none bg-[#F1F5F9] py-2 pl-10 pr-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] transition-all focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/chat" className="flex items-center gap-2 rounded-lg bg-[#EEF2FF] px-3 py-1.5 text-sm font-semibold text-[#4F46E5] transition-colors hover:bg-[#4F46E5] hover:text-white">
          <Sparkles size={16} />
          IA
        </Link>
        <ThemeToggle />
        <Link href="/dashboard/desempenho" className="relative p-2 text-[#64748B] transition-colors hover:text-[#0F172A]" aria-label="Desempenho">
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </Link>
        <Link href="/dashboard/configuracoes" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4F46E5]/20 bg-[#4F46E5]/10 text-sm font-bold text-[#4F46E5]" aria-label="Configurações">
          {getProfileInitials(profileName).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
