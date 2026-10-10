/**
 * Medição 2 do item 1.2: gera uma amostra de questões do jeito que o app gera para os alunos (estilo ENEM,
 * 5 alternativas, regras do sistema + conferência às cegas) e guarda para REVISÃO HUMANA. Nada aparece para alunos.
 *
 *   npx tsx --env-file=.env.local scripts/eval/generate-sample.ts [--per-area 30] [--model gemini-2.5-flash-lite] [--batch eval-2026-10-10]
 *
 * Depois, um revisor abre /dashboard/interno/questoes, seção "Avaliação de confiabilidade", e marca cada uma
 * como correta ou incorreta. Correta = gabarito certo, só uma alternativa defensável e explicação sem erro.
 * Por fim: scripts/eval/report.ts gera o relatório e (com --save) alimenta o portão de qualidade.
 */
import { runWithAiCallContext } from "@/lib/ai-cost";
import { ENEM_AREAS, EVAL_BATCH_PREFIX, EVAL_OWNER, ORIGIN, SEED_SUBJECTS } from "@/lib/bank/constants";
import { generateJSONList } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { verifyQuizQuestions } from "@/lib/question-quality";
import { answerFormatInstruction, generateQuizQuestions, questionDedupeKey, quizQuestionsSchemaFor } from "@/lib/quiz-questions";
import type { GeneratedQuizQuestion } from "@/types";

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? "") : undefined;
}

/** Matérias de cada área usadas na amostra (as que mais caem; Inglês/Espanhol ficam fora). */
const SUBJECTS_BY_AREA: Record<string, string[]> = {
  linguagens: ["lingua-portuguesa", "literatura"],
  "ciencias-humanas": ["historia", "geografia", "filosofia", "sociologia"],
  "ciencias-natureza": ["fisica", "quimica", "biologia"],
  matematica: ["matematica"],
};

const STYLE = "ENEM, com textos-base, situações do cotidiano, interpretação e interdisciplinaridade";

async function main() {
  const perArea = Number(arg("per-area") ?? 30);
  const model = arg("model");
  const batch = arg("batch") ?? `${EVAL_BATCH_PREFIX}${new Date().toISOString().slice(0, 10)}`;
  if (!batch.startsWith(EVAL_BATCH_PREFIX)) throw new Error(`O lote precisa começar com ${EVAL_BATCH_PREFIX}`);
  const prisma = getPrisma();
  const exam = await prisma.exam.findUnique({ where: { slug: "enem" } });
  if (!exam) throw new Error("Exame ENEM não encontrado no banco (rode a importação antes).");
  const startedAt = new Date();
  let number = await prisma.bankQuestion.count({ where: { importBatch: batch } });

  for (const [area, slugs] of Object.entries(SUBJECTS_BY_AREA)) {
    for (const [index, slug] of slugs.entries()) {
      const count = Math.floor(perArea / slugs.length) + (index < perArea % slugs.length ? 1 : 0);
      if (!count) continue;
      const subject = SEED_SUBJECTS.find((item) => item.slug === slug)!;
      const bankSubject = await prisma.bankSubject.findUnique({ where: { slug } });
      const prompt = (size: number) => `Gere exatamente ${size} questoes ineditas de multipla escolha de ${subject.name} no nivel medio no estilo de ${STYLE}.
Regras obrigatorias:
- Cada enunciado deve conter uma situacao, dado, texto curto, fenomeno ou contexto real.
- As alternativas devem ser conteudos concretos, nunca placeholders.
- A explicacao deve justificar a alternativa correta e mencionar por que ao menos um distrator esta errado, em ate 3 frases.
- Confira cada questao: exatamente UMA alternativa correta, e o gabarito e a explicacao precisam bater com ela.
Retorne APENAS um array JSON valido com: question (string), ${answerFormatInstruction(5)}, explanation (string).`;

      const questions: GeneratedQuizQuestion[] = await runWithAiCallContext({ userId: null, plan: null, feature: "eval_generate" }, () =>
        generateQuizQuestions(
          count,
          (missing) => generateJSONList<GeneratedQuizQuestion>({ total: missing, chunkSize: 5, schema: quizQuestionsSchemaFor(5), buildPrompt: (size) => prompt(size), dedupeKey: questionDedupeKey, model }),
          { verify: (items) => verifyQuizQuestions(items, 5), optionCount: 5 },
        ),
      );

      for (const question of questions) {
        number += 1;
        await prisma.bankQuestion.create({
          data: {
            examId: exam.id,
            year: 0,
            number,
            variant: batch,
            area,
            statement: question.question,
            options: question.options.map((option) => ({ label: option.charAt(0), text: option.replace(/^[A-E]\)\s*/, ""), imageUrl: null })),
            correctLabel: question.correctAnswer,
            subjectId: bankSubject?.id ?? null,
            origin: ORIGIN.ai,
            sourceName: `Easy Education (IA${model ? `: ${model}` : ""})`,
            explanation: question.explanation,
            explanationStatus: "validada",
            isPublished: false,
            ownerUserId: EVAL_OWNER,
            importBatch: batch,
          },
        });
      }
      console.log(`${ENEM_AREAS[area]} · ${subject.name}: ${questions.length} questões`);
    }
  }

  const cost = await prisma.aiCallLog.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: startedAt }, feature: "eval_generate" } });
  console.log(`\nLote ${batch}: ${number} questões para revisão em /dashboard/interno/questoes. Custo: US$ ${Number(cost._sum.costUsd ?? 0).toFixed(4)}.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
