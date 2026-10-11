import { Flame, Target, Zap } from "lucide-react";
import type { Gamification } from "@/lib/gamification";
import { XP_RULES } from "@/lib/xp";
import { cn } from "@/lib/utils";

/** Card de progresso: nível com barra até o próximo, meta de XP do dia e o XP de cada dia da semana. */
export function LevelCard({ stats, className }: { stats: Gamification; className?: string }) {
  const max = Math.max(stats.dailyGoalXp, ...stats.week.map((day) => day.xp));
  const goalDone = stats.todayXp >= stats.dailyGoalXp;
  return (
    <section aria-label="Seu progresso" className={cn("rounded-2xl border border-border bg-surface p-4 shadow-card lg:p-5", className)}>
      <div className="flex items-center gap-3">
        <span className="grid size-14 flex-none place-items-center rounded-2xl bg-brand text-on-brand shadow-[0_4px_0_var(--brand-strong)]">
          <span className="flex flex-col items-center leading-none">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Nível</span>
            <span className="text-2xl font-black">{stats.level}</span>
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-baseline justify-between gap-2">
            <span className="text-base font-extrabold text-ink">{stats.title}</span>
            <span className="text-xs font-semibold tabular-nums text-ink-muted">{stats.xp} XP</span>
          </p>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(stats.progress * 100)} aria-label="Progresso até o próximo nível">
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${Math.max(4, stats.progress * 100)}%` }} />
          </div>
          <p className="m-0 mt-1 text-xs text-ink-muted">Faltam {stats.toNext} XP para o nível {stats.level + 1}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className={cn("flex items-center gap-2 rounded-xl p-2.5", goalDone ? "bg-success-tint" : "bg-surface-muted")}>
          <Target className={cn("size-5 flex-none", goalDone ? "text-success" : "text-brand-strong")} aria-hidden="true" />
          <span className="text-xs leading-4 text-ink">
            <span className="block font-extrabold tabular-nums">
              {Math.min(stats.todayXp, stats.dailyGoalXp)}/{stats.dailyGoalXp} XP
            </span>
            {goalDone ? "Meta de hoje feita" : "Meta de hoje"}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface-muted p-2.5">
          <Flame className={cn("size-5 flex-none", stats.todayXp > 0 ? "fill-[#fb923c] text-[#f97316]" : "text-ink-muted")} aria-hidden="true" />
          <span className="text-xs leading-4 text-ink">
            <span className="block font-extrabold tabular-nums">
              {stats.streak} {stats.streak === 1 ? "dia" : "dias"}
            </span>
            de ofensiva
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="m-0 mb-2 flex items-center gap-1 text-xs font-semibold text-ink-muted">
          <Zap className="size-3.5" aria-hidden="true" /> XP da semana
        </p>
        <ol className="m-0 grid h-24 list-none grid-cols-7 items-end gap-1.5 p-0" aria-label="XP de cada dia da semana">
          {stats.week.map((day, index) => {
            const today = index === stats.week.length - 1;
            return (
              <li key={day.day} className="flex h-full flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-bold tabular-nums text-ink-muted">{day.xp || ""}</span>
                <span
                  className={cn("w-full rounded-md", day.xp ? (today ? "bg-brand" : "bg-brand/50") : "bg-track")}
                  style={{ height: `${Math.max(6, (day.xp / max) * 64)}px` }}
                  title={`${day.label}: ${day.xp} XP`}
                />
                <span className={cn("text-[10px] capitalize", today ? "font-extrabold text-ink" : "text-ink-muted")}>{day.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="m-0 mt-3 text-[11px] leading-4 text-ink-muted">
        Questão certa +{XP_RULES.correct} XP · bloco concluído +{XP_RULES.block} · resumo do dia +{XP_RULES.daySummary} · cartão revisado +{XP_RULES.card}
      </p>
    </section>
  );
}
