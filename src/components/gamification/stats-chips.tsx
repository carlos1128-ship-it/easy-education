import Link from "next/link";
import { Flame, Zap } from "lucide-react";
import type { Gamification } from "@/lib/gamification";
import { cn } from "@/lib/utils";

/**
 * Ofensiva e XP no topo do app, sempre à vista (como nos apps de estudo gamificados).
 * A chama fica cinza quando o aluno ainda não estudou hoje.
 */
export function StatsChips({ stats, className }: { stats: Gamification; className?: string }) {
  const studiedToday = stats.todayXp > 0;
  return (
    <Link
      href="/dashboard/trilha"
      prefetch={false}
      aria-label={`Ofensiva de ${stats.streak} ${stats.streak === 1 ? "dia" : "dias"}, nível ${stats.level}, ${stats.xp} XP`}
      className={cn("flex flex-none items-center gap-0.5 whitespace-nowrap rounded-full no-underline", className)}
    >
      <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-sm font-extrabold tabular-nums", studiedToday ? "text-[#f97316]" : "text-ink-muted")}>
        <Flame className={cn("size-[18px]", studiedToday && "fill-[#fb923c]")} strokeWidth={2.25} aria-hidden="true" />
        {stats.streak}
      </span>
      <span className="flex items-center gap-1 rounded-full bg-brand-tint px-2 py-1 text-sm font-extrabold tabular-nums text-brand-strong">
        <Zap className="size-[16px] fill-current" strokeWidth={2.25} aria-hidden="true" />
        <span>Nv&nbsp;{stats.level}</span>
      </span>
    </Link>
  );
}
