import { ORIGIN } from "@/lib/bank/constants";
import type { PlanTier } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";

/**
 * Questão ultrassecreta: questão de um dos assuntos que MAIS CAEM naquele exame (as 3 matérias, ou áreas,
 * com mais questões publicadas do exame). Cerca de 1 em cada 4 questões desses assuntos ganha o selo, por uma
 * escolha fixa pelo id (não muda a cada visita). No plano Básico ela fica trancada (dá para pular); no Completo, aberta.
 */

/** Hash estável (FNV-1a) do id: decide o selo sem guardar nada no banco. */
function stableHash(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Chave de assunto da questão: a matéria; sem matéria (parte do ENEM), a grande área. */
export function topicKey(question: { subject?: { slug: string } | null; area?: string | null }) {
  return question.subject?.slug ?? question.area ?? "";
}

export function isUltrasecret(question: { id: string; subject?: { slug: string } | null; area?: string | null }, topKeys: string[]) {
  const key = topicKey(question);
  return Boolean(key) && topKeys.includes(key) && stableHash(question.id) % 4 === 0;
}

export function ultrasecretLocked(tier: PlanTier | null | undefined) {
  return tier !== "full";
}

const topCache = new Map<string, { at: number; keys: string[] }>();

/** As 3 matérias (ou áreas) com mais questões publicadas no exame. Guardado por 10 minutos. */
export async function topKeysForExam(examSlug: string) {
  const cached = topCache.get(examSlug);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.keys;
  const prisma = getPrisma();
  const where = { isPublished: true, origin: ORIGIN.official, exam: { slug: examSlug } };
  const bySubject = await prisma.bankQuestion.groupBy({ by: ["subjectId"], where: { ...where, subjectId: { not: null } }, _count: { _all: true } });
  let keys: string[];
  if (bySubject.length >= 3) {
    const top = bySubject.sort((a, b) => b._count._all - a._count._all).slice(0, 3).map((row) => row.subjectId as string);
    keys = (await prisma.bankSubject.findMany({ where: { id: { in: top } }, select: { slug: true } })).map((row) => row.slug);
  } else {
    const byArea = await prisma.bankQuestion.groupBy({ by: ["area"], where: { ...where, area: { not: null } }, _count: { _all: true } });
    keys = byArea.sort((a, b) => b._count._all - a._count._all).slice(0, 3).flatMap((row) => (row.area ? [row.area] : []));
  }
  topCache.set(examSlug, { at: Date.now(), keys });
  return keys;
}

