/**
 * O que é "concluído" no plano de estudos. É a ÚNICA regra: o bloco (botão Iniciar/Continuar), o roteiro
 * e a trilha (dia concluído = nível) leem daqui.
 *
 * Bloco concluído = a atividade do bloco terminou OU os minutos planejados do bloco foram cumpridos.
 *  - estudo: quiz respondido até o fim (ou a sessão de provas anteriores terminada);
 *  - simulado: simulado respondido até o fim;
 *  - revisão: todos os cartões do deck revisados depois do início do bloco;
 *  - redação: redação enviada para correção depois do início do bloco.
 * Dia concluído = todos os blocos do dia concluídos OU os minutos do dia cumpridos.
 */

import { slugify } from "@/lib/bank/constants";

export type BlockType = "estudo" | "revisao" | "simulado" | "redacao";
export type BlockStatus = "pendente" | "em_andamento" | "concluido";
export type CompletedBy = "atividade" | "tempo";

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** Dia no horário de Brasília, "AAAA-MM-DD". */
export function dayKeySP(now: Date = new Date()) {
  return dayFormatter.format(now);
}

/** Identidade de um bloco dentro do dia: matéria, assunto e tipo normalizados. */
export function blockKey(block: { subject: string; topic?: string | null; type: string }) {
  return [slugify(block.subject) || "geral", slugify(block.topic ?? "").slice(0, 80), block.type].join("|");
}

/** Bloco concluído? Atividade terminada vence; senão, os minutos registrados precisam cobrir o planejado. */
export function blockCompletion(input: { plannedMinutes: number; studiedMinutes: number; activityDone: boolean }): CompletedBy | null {
  if (input.activityDone) return "atividade";
  if (input.plannedMinutes > 0 && input.studiedMinutes >= input.plannedMinutes) return "tempo";
  return null;
}

/** Atividades feitas no dia sem passar pelo "Iniciar" (o aluno abriu o quiz direto, por exemplo). */
export type DayActivity = { minutes: number; quiz: number; simulado: number; essay: number; cards: number };

/** Cartões revisados que valem um bloco de revisão quando o aluno não usou o "Iniciar". */
export const REVIEW_CARDS_FOR_BLOCK = 10;

/**
 * Dia concluído? Minutos do dia cumpridos, ou cada bloco do dia concluído. Um bloco conta como concluído pelo
 * registro do "Iniciar" (`done`) ou, sem registro, por uma atividade do mesmo tipo feita no dia; cada atividade
 * cobre um bloco só (dois blocos de estudo pedem dois quizzes). Dia sem bloco no plano: um quiz ou os minutos.
 */
export function isDayComplete(input: {
  targetMinutes: number;
  activity: DayActivity;
  blocks: Array<{ type: string; done?: boolean }>;
}) {
  if (input.activity.minutes >= input.targetMinutes) return true;
  const pool = { ...input.activity };
  const blocks = input.blocks.length ? input.blocks : [{ type: "estudo" }];
  return blocks.every((block) => {
    if (block.done) return true;
    switch (block.type) {
      case "revisao":
        if (pool.cards < REVIEW_CARDS_FOR_BLOCK) return false;
        pool.cards -= REVIEW_CARDS_FOR_BLOCK;
        return true;
      case "simulado":
        if (pool.simulado < 1) return false;
        pool.simulado -= 1;
        return true;
      case "redacao":
        if (pool.essay < 1) return false;
        pool.essay -= 1;
        return true;
      default:
        if (pool.quiz < 1) return false;
        pool.quiz -= 1;
        return true;
    }
  });
}

/** Estado mostrado no plano para um bloco de hoje. */
export function blockStatus(run: { status: string } | null | undefined): BlockStatus {
  if (!run) return "pendente";
  return run.status === "concluido" ? "concluido" : "em_andamento";
}

/** Minutos de um trecho do cronômetro (de `from` até `to`), entre 0 e 600. */
export function segmentMinutes(from: Date | null | undefined, to: Date = new Date()) {
  if (!from) return 0;
  return Math.max(0, Math.min(600, Math.round((to.getTime() - from.getTime()) / 60_000)));
}
