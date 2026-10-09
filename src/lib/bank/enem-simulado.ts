import { ORIGIN } from "@/lib/bank/constants";
import { visibleWhere } from "@/lib/bank/service";
import { getPrisma } from "@/lib/prisma";

/**
 * Simulados de provas anteriores do ENEM, montados como a prova: 45 questões por área, misturando
 * edições (o aluno vê só "ENEM"; o ano aparece na fonte de cada questão, como pede a licença).
 */
export const ENEM_DAYS = {
  dia1: { label: "1º dia", title: "Linguagens e Ciências Humanas", areas: ["linguagens", "ciencias-humanas"], timeLimitSec: 5 * 3600 + 30 * 60 },
  dia2: { label: "2º dia", title: "Ciências da Natureza e Matemática", areas: ["ciencias-natureza", "matematica"], timeLimitSec: 5 * 3600 },
  completo: { label: "Prova completa", title: "Os dois dias", areas: ["linguagens", "ciencias-humanas", "ciencias-natureza", "matematica"], timeLimitSec: 10 * 3600 + 30 * 60 },
} as const;

export type EnemDay = keyof typeof ENEM_DAYS;
export const ENEM_LANGUAGES = { ingles: "Inglês", espanhol: "Espanhol" } as const;
export type EnemLanguage = keyof typeof ENEM_LANGUAGES;

/** Questões por área na prova, e de língua estrangeira dentro de Linguagens. */
export const PER_AREA = 45;
export const FOREIGN_LANGUAGE_COUNT = 5;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Sorteia `count` questões, dando preferência às que o aluno ainda não respondeu. */
export function pickPreferringUnseen<T extends { id: string }>(rows: T[], seen: Set<string>, count: number) {
  const fresh = shuffle(rows.filter((row) => !seen.has(row.id)));
  const repeated = shuffle(rows.filter((row) => seen.has(row.id)));
  return [...fresh, ...repeated].slice(0, count);
}

/** Monta o simulado: área por área, na ordem da prova; em Linguagens, as 5 de língua estrangeira vêm primeiro. */
export async function pickEnemSimulado(userId: string, day: EnemDay, language: EnemLanguage) {
  const prisma = getPrisma();
  const config = ENEM_DAYS[day];
  const rows = await prisma.bankQuestion.findMany({
    where: { AND: [visibleWhere(userId), { origin: ORIGIN.official, exam: { slug: "enem" }, area: { in: [...config.areas] } }] },
    select: { id: true, area: true, variant: true },
  });
  const seen = new Set((await prisma.bankAnswer.findMany({ where: { userId, questionId: { in: rows.map((row) => row.id) } }, select: { questionId: true } })).map((row) => row.questionId));

  const ids: string[] = [];
  for (const area of config.areas) {
    const inArea = rows.filter((row) => row.area === area);
    if (area === "linguagens") {
      const foreign = pickPreferringUnseen(inArea.filter((row) => row.variant === language), seen, FOREIGN_LANGUAGE_COUNT);
      const general = pickPreferringUnseen(inArea.filter((row) => !row.variant), seen, PER_AREA - foreign.length);
      ids.push(...foreign.map((row) => row.id), ...general.map((row) => row.id));
    } else {
      ids.push(...pickPreferringUnseen(inArea.filter((row) => !row.variant), seen, PER_AREA).map((row) => row.id));
    }
  }
  return ids;
}

/** Quantas questões existem hoje por área (para avisar se ainda não dá uma prova inteira). */
export async function enemPoolSize(userId: string) {
  const grouped = await getPrisma().bankQuestion.groupBy({
    by: ["area"],
    where: { AND: [visibleWhere(userId), { origin: ORIGIN.official, exam: { slug: "enem" } }] },
    _count: { _all: true },
  });
  return Object.fromEntries(grouped.map((item) => [item.area ?? "geral", item._count._all])) as Record<string, number>;
}
