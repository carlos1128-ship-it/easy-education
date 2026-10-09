/**
 * Classifica as questões importadas e gera a resolução comentada, uma única vez, no servidor.
 *
 *   npx tsx --env-file=.env.local scripts/bank/classify.ts --batch piloto [--limit 50] [--concurrency 3]
 *
 * Para cada questão a IA resolve SEM ver o gabarito. O gabarito oficial é a verdade:
 *   - resposta da IA = gabarito  → resolução "validada" e questão publicada;
 *   - resposta da IA ≠ gabarito  → "divergente": NÃO publica, fica para revisão.
 * Mostra no final quantas passaram e quanto a IA custou.
 */
import { runWithAiCallContext } from "@/lib/ai-cost";
import { solveAndClassify } from "@/lib/bank/ai";
import { ENEM_AREAS } from "@/lib/bank/constants";
import type { BankOption } from "@/lib/bank/import";
import { normalizeDifficulty } from "@/lib/bank/ai";
import { upsertTopic } from "@/lib/bank/service";
import { getPrisma } from "@/lib/prisma";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

/** Limite por minuto da chave (429): espera e tenta de novo, em vez de perder a questão. */
async function withBackoff<T>(run: () => Promise<T>) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const limited = message.includes("429") || message.toLowerCase().includes("quota") || message.includes("RESOURCE_EXHAUSTED");
      if (!limited || attempt >= 5) throw error;
      const wait = 20_000 + attempt * 15_000;
      console.log(`   limite por minuto da IA; esperando ${wait / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}

async function main() {
  const batch = arg("batch");
  if (!batch) throw new Error("Informe --batch NOME (o lote criado pelo import-enem).");
  const limit = Number(arg("limit") ?? 0) || undefined;
  const concurrency = Number(arg("concurrency") ?? 3);
  const prisma = getPrisma();
  const startedAt = new Date();

  const pending = await prisma.bankQuestion.findMany({
    where: { importBatch: batch, explanationStatus: "pendente" },
    include: { exam: true },
    orderBy: [{ year: "desc" }, { number: "asc" }],
    take: limit,
  });
  console.log(`${pending.length} questões a classificar no lote "${batch}".`);

  const subjects = new Map((await prisma.bankSubject.findMany()).map((subject) => [subject.slug, subject]));
  const stats = { validada: 0, divergente: 0, erro: 0 };
  const divergent: string[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < pending.length) {
      const question = pending[cursor];
      cursor += 1;
      const label = `${question.year} Q${question.number}${question.variant ? ` (${question.variant})` : ""}`;
      try {
        const options = question.options as unknown as BankOption[];
        const images = Array.isArray(question.images) ? (question.images as string[]) : [];
        const known = (await prisma.bankTopic.findMany({ where: { subject: { area: question.area ?? undefined } }, take: 40, select: { name: true } })).map((topic) => topic.name);
        const solved = await withBackoff(() =>
          runWithAiCallContext({ feature: "bank_batch" }, () =>
            solveAndClassify({ area: question.area, statement: question.statement, supportText: question.supportText, options, images, examName: question.exam.name }, known),
          ),
        );

        const subject = subjects.get(solved.subject) ?? null;
        const topic = subject && solved.topic ? await upsertTopic(subject.id, solved.topic) : null;
        const agrees = solved.answer === question.correctLabel;
        const explanation = agrees
          ? solved.explanation.trim()
          : `${solved.explanation.trim()}\n\n[REVISAR] A IA marcou a alternativa ${solved.answer}, mas o gabarito oficial é ${question.correctLabel}.`;

        await prisma.bankQuestion.update({
          where: { id: question.id },
          data: {
            subjectId: subject?.id,
            topicId: topic?.id,
            subtopic: solved.subtopic?.trim().slice(0, 120) || null,
            skill: solved.skill?.trim().slice(0, 20) || null,
            difficulty: normalizeDifficulty(solved.difficulty),
            explanation,
            explanationStatus: agrees ? "validada" : "divergente",
            isPublished: agrees,
          },
        });
        stats[agrees ? "validada" : "divergente"] += 1;
        if (!agrees) divergent.push(`${label}: IA=${solved.answer} gabarito=${question.correctLabel}`);
        console.log(`${agrees ? "ok       " : "DIVERGE  "} ${label} · ${ENEM_AREAS[question.area ?? ""] ?? question.area} → ${subject?.name ?? "?"}`);
      } catch (error) {
        stats.erro += 1;
        console.error(`ERRO     ${label}:`, error instanceof Error ? error.message.slice(0, 140) : error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  const cost = await prisma.aiCallLog.aggregate({
    _sum: { costUsd: true, inputTokens: true, outputTokens: true },
    _count: { _all: true },
    where: { feature: "bank_batch", createdAt: { gte: startedAt } },
  });
  const usd = Number(cost._sum.costUsd ?? 0);
  console.log("\n=== Resultado ===");
  console.log(stats);
  if (divergent.length) console.log("Divergências (não publicadas, para revisão):\n- " + divergent.join("\n- "));
  console.log(
    `Chamadas à IA: ${cost._count._all} · tokens: ${cost._sum.inputTokens ?? 0} entrada / ${cost._sum.outputTokens ?? 0} saída · custo estimado: US$ ${usd.toFixed(4)} (≈ R$ ${(usd * 5.5).toFixed(2)})`,
  );
  const done = stats.validada + stats.divergente;
  if (done) console.log(`Custo médio por questão: US$ ${(usd / done).toFixed(4)} (≈ R$ ${((usd / done) * 5.5).toFixed(3)})`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
