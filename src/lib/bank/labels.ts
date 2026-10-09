import { ORIGIN } from "@/lib/bank/constants";

type SourceInfo = {
  origin: string;
  year: number;
  number: number;
  variant?: string | null;
  edition?: string | null;
  exam: { name: string; styleLabel: string };
};

const VARIANT_LABEL: Record<string, string> = { ingles: "Inglês", espanhol: "Espanhol" };

/** "ENEM 2022, Questão 45" para prova oficial; "Gerada por IA" para questão gerada. Nunca "questão real" em questão de IA. */
export function sourceLabel(question: SourceInfo) {
  if (question.origin === ORIGIN.ai) return "Gerada por IA";
  const variant = question.variant ? ` (${VARIANT_LABEL[question.variant] ?? question.variant})` : "";
  const edition = question.edition ? `, caderno ${question.edition}` : "";
  return `${question.exam.name} ${question.year}${edition}, Questão ${question.number}${variant}`;
}

export function isAiQuestion(question: { origin: string }) {
  return question.origin === ORIGIN.ai;
}

/** Frase que acompanha o selo das questões de IA. */
export function aiStyleNote(question: { exam: { styleLabel: string } }) {
  return `Questão no estilo do ${question.exam.styleLabel}, criada por IA. Não é uma questão de prova.`;
}
