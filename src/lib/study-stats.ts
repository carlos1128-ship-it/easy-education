import { dayKeySP } from "@/lib/study-completion";
import { startOfDaySP } from "@/lib/time-window";

const DAY_MS = 86_400_000;

/** Meia-noite de hoje no horário de Brasília (o servidor roda em UTC). */
export function startOfToday(now: Date = new Date()) {
  return startOfDaySP(now);
}

export function startOfWindow(days: number, now: Date = new Date()) {
  return new Date(startOfDaySP(now).getTime() - days * DAY_MS);
}

/** Dias seguidos com estudo registrado ou quiz concluído, contando de hoje para trás (dias de Brasília). */
export function calculateStreak(dates: Date[], now: Date = new Date()) {
  const active = new Set(dates.map((date) => dayKeySP(date)));
  let streak = 0;
  // Meio-dia de Brasília de cada dia, para andar de dia em dia sem cair na virada.
  let cursor = startOfDaySP(now).getTime() + 12 * 3_600_000;
  while (active.has(dayKeySP(new Date(cursor)))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}
