import { slugify } from "@/lib/bank/constants";
import { qualityGate, type GateDecision } from "@/lib/ai-quality";
import { getPrisma } from "@/lib/prisma";

/**
 * Portão de qualidade (1.2): a matéria cuja última revisão humana deu menos de 90% de questões corretas passa a
 * gerar com um modelo mais forte, até ser reavaliada. Sem avaliação, nada muda.
 */

/** Modelo do plano B. Mais caro que o padrão (ver docs/consumo-ia.md), por isso só nos escopos reprovados. */
export const STRONG_MODEL = process.env.GEMINI_STRONG_MODEL ?? "gemini-2.5-flash";

const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { decision: GateDecision; expiresAt: number }>();

export function subjectScope(subject: string) {
  return `materia:${slugify(subject) || "geral"}`;
}

export async function gateDecisionFor(scope: string): Promise<GateDecision> {
  const cached = cache.get(scope);
  if (cached && cached.expiresAt > Date.now()) return cached.decision;
  const score = await getPrisma()
    .aiQualityScore.findFirst({ where: { scope, kind: "geradas" }, orderBy: { createdAt: "desc" }, select: { sample: true, correct: true } })
    .catch(() => null);
  const decision = qualityGate(score);
  cache.set(scope, { decision, expiresAt: Date.now() + CACHE_MS });
  return decision;
}

/** Modelo a usar na geração desta matéria: o forte se ela está no plano B; senão, o padrão (undefined). */
export async function generationModelFor(subject: string) {
  return (await gateDecisionFor(subjectScope(subject))) === "plano_b" ? STRONG_MODEL : undefined;
}
