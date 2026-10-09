import type { LimitWindow } from "@/lib/plans";

/**
 * Janelas de limite no horário de Brasília. O Brasil não usa horário de verão desde 2019,
 * então America/Sao_Paulo é UTC-3 o ano todo.
 */
const SP_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Meia-noite de Brasília do dia de `now`. */
export function startOfDaySP(now: Date = new Date()): Date {
  const local = now.getTime() + SP_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - SP_OFFSET_MS);
}

/** Segunda-feira, 00:00 de Brasília, da semana de `now`. */
export function startOfWeekSP(now: Date = new Date()): Date {
  const dayStart = startOfDaySP(now);
  const weekday = new Date(dayStart.getTime() + SP_OFFSET_MS).getUTCDay(); // 0 = domingo
  const sinceMonday = (weekday + 6) % 7;
  return new Date(dayStart.getTime() - sinceMonday * DAY_MS);
}

/** Dia 1º do mês, 00:00 de Brasília, do mês de `now`. */
export function startOfMonthSP(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + SP_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - SP_OFFSET_MS);
}

/** Dia 1º do mês seguinte, 00:00 de Brasília (quando o teto mensal volta). */
export function startOfNextMonthSP(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + SP_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - SP_OFFSET_MS);
}

export function windowStart(window: LimitWindow, now: Date = new Date()): Date {
  return window === "day" ? startOfDaySP(now) : startOfWeekSP(now);
}

/** Quando o limite volta: início da próxima janela. */
export function windowReset(window: LimitWindow, now: Date = new Date()): Date {
  const start = windowStart(window, now);
  return new Date(start.getTime() + (window === "day" ? DAY_MS : 7 * DAY_MS));
}

const weekdayFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" });

/** "amanhã às 00:00" ou "segunda-feira às 00:00" (horário de Brasília), para as mensagens de limite. */
export function describeReset(window: LimitWindow, now: Date = new Date()): string {
  // Sem horário nem data: a interface não mostra números de limite.
  if (window === "day") return "amanhã";
  return `na ${weekdayFormat.format(windowReset(window, now))}`;
}
