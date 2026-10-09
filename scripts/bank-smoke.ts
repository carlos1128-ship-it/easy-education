/**
 * Teste de fumaça do banco de questões contra o banco configurado em .env.local.
 * Cria um aluno de mentira (só uma linha em profiles), roda prática, simulado, revisão, marcação e report,
 * e apaga tudo no final.
 *
 *   npx tsx --env-file=.env.local scripts/bank-smoke.ts
 */
import { ORIGIN } from "@/lib/bank/constants";
import {
  answerQuestion,
  createSession,
  finishSession,
  getFilterOptions,
  getReviewQueue,
  gradeReview,
  listQuestions,
  pickQuestionIds,
  reportQuestion,
  setBookmark,
  getSessionForUser,
  BankError,
} from "@/lib/bank/service";
import { pickEnemSimulado } from "@/lib/bank/enem-simulado";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();
const userId = `smoke-bank-${Date.now()}`;

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(`FALHOU: ${message}`);
  console.log("ok -", message);
}

async function main() {
  await prisma.profile.create({ data: { userId, name: "Smoke", email: `${userId}@example.invalid` } });
  try {
    const options = await getFilterOptions(userId);
    assert(options.exams.length > 0 && options.years.length > 0, `filtros com dados reais (${options.exams.length} exame, anos ${options.years.join(",")})`);

    const { total, rows } = await listQuestions(userId, {}, 1);
    assert(total > 0 && rows.length > 0, `lista só com questões publicadas (${total})`);
    assert(rows.every((row) => row.isPublished), "nenhuma questão não publicada aparece");

    // Prática: responde errado de propósito.
    const ids = await pickQuestionIds(userId, {}, 4);
    assert(ids.length === 4, "sorteio de 4 questões");
    const session = await createSession({ userId, kind: "practice", title: "teste", questionIds: ids });
    const loaded = await getSessionForUser(userId, session.id);
    assert(loaded?.questions.length === 4, "sessão carrega as questões");
    const first = loaded!.questions[0];
    const wrong = first.correctLabel === "A" ? "B" : "A";
    const result = await answerQuestion({ userId, questionId: first.id, sessionId: session.id, selected: wrong, timeMs: 4000 });
    assert(result.recorded && "correctLabel" in result && result.correctLabel === first.correctLabel && result.isCorrect === false, "prática mostra gabarito e marca erro");
    // Resolução comentada só existe quando a da IA bateu com o gabarito oficial; senão vem null (e a tela não mostra).
    assert("explanation" in result && (first.explanationStatus === "validada" ? Boolean(result.explanation) : result.explanation === first.explanation), "prática devolve a resolução quando ela existe");

    const again = await answerQuestion({ userId, questionId: first.id, sessionId: session.id, selected: first.correctLabel, timeMs: 1000 });
    assert(again.alreadyAnswered === true, "responder duas vezes não duplica");

    const queue = await getReviewQueue(userId, true);
    assert(queue.rows.some((row) => row.questionId === first.id), "o erro entra na revisão espaçada");
    assert((await getReviewQueue(userId, false)).dueCount === 0, "erro só vence amanhã (não está para hoje)");

    const marked = loaded!.questions[1];
    await setBookmark(userId, marked.id, true);
    assert((await getReviewQueue(userId, false)).dueCount === 1, "questão marcada entra na revisão para hoje");
    const next = await gradeReview(userId, marked.id, "good");
    assert(next.intervalDays === 1 && next.repetitions === 1, "nota 'bom' agenda a próxima revisão");

    await reportQuestion({ userId, questionId: first.id, kind: "gabarito_errado", note: "teste de fumaça" });
    assert((await prisma.questionReport.count({ where: { userId } })) === 1, "report salvo");
    let badKind: unknown = null;
    try {
      await reportQuestion({ userId, questionId: first.id, kind: "invalido" });
    } catch (error) {
      badKind = error;
    }
    assert(badKind instanceof BankError, "tipo de report inválido é recusado");

    const finished = await finishSession(userId, session.id);
    assert(finished.result.total === 4 && finished.result.answered === 1 && finished.result.correct === 0, "resultado: em branco conta como erro");
    assert((await prisma.studySession.count({ where: { userId } })) === 1, "tempo de estudo registrado para o painel");
    await finishSession(userId, session.id);
    assert((await prisma.studySession.count({ where: { userId } })) === 1, "encerrar duas vezes não duplica o tempo de estudo");

    // Simulado do ENEM (1º dia): 90 questões, 45 por área, 5 de inglês primeiro; não revela gabarito.
    const simuladoIds = await pickEnemSimulado(userId, "dia1", "ingles");
    assert(simuladoIds.length === 90 && new Set(simuladoIds).size === 90, "1º dia tem 90 questões sem repetir");
    const firstFive = await prisma.bankQuestion.findMany({ where: { id: { in: simuladoIds.slice(0, 5) } }, select: { variant: true, area: true } });
    assert(firstFive.every((row) => row.variant === "ingles" && row.area === "linguagens"), "as 5 primeiras são de inglês");
    const day2 = await prisma.bankQuestion.findMany({ where: { id: { in: await pickEnemSimulado(userId, "dia2", "ingles") } }, select: { area: true } });
    assert(day2.length === 90 && day2.every((row) => row.area === "ciencias-natureza" || row.area === "matematica"), "2º dia: Natureza e Matemática");
    if (simuladoIds.length) {
      const sim = await createSession({ userId, kind: "simulado", title: "sim", questionIds: simuladoIds, timeLimitSec: 600 });
      const q = (await getSessionForUser(userId, sim.id))!.questions[0];
      const r = await answerQuestion({ userId, questionId: q.id, sessionId: sim.id, selected: "A", timeMs: 2000 });
      assert(r.recorded && !("correctLabel" in r), "simulado não revela o gabarito durante a prova");
    }

    // Questão de IA de outro aluno não aparece.
    const exam = await prisma.exam.findFirstOrThrow({ where: { slug: "enem" } });
    const other = await prisma.bankQuestion.create({
      data: { examId: exam.id, year: 0, number: 1, statement: "x", options: [], correctLabel: "A", origin: ORIGIN.ai, sourceName: "Gerada por IA", isPublished: true, ownerUserId: "outro-aluno" },
    });
    assert((await listQuestions(userId, {}, 1)).rows.every((row) => row.id !== other.id), "questão de IA de outro aluno não aparece");
    await prisma.bankQuestion.delete({ where: { id: other.id } });
  } finally {
    // Apaga também restos de execuções anteriores que falharam no meio (o tempo de estudo vem antes do perfil por causa da chave estrangeira).
    await prisma.studySession.deleteMany({ where: { userId: { startsWith: "smoke-bank-" } } });
    await prisma.profile.deleteMany({ where: { userId: { startsWith: "smoke-bank-" } } });
    await prisma.$disconnect();
  }
  console.log("\nTudo certo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
