import type { User } from "@supabase/supabase-js";
import type { StudyBlockRun } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { blockCompletion, blockKey, dayKeySP, segmentMinutes, type BlockStatus } from "@/lib/study-completion";
import { getTodayPlanBlocks, parseStudyPlan } from "@/lib/study-plan";
import { buildRoadmap, parseManualChecks, roadmapChecks, toggleManualCheck, type RoadmapStep } from "@/lib/study-roadmap";
import { StudyStartError, startStudyBlockForUser, type StudyBlockInput } from "@/lib/study-start";

/**
 * Estado dos blocos do plano no servidor (pendente → em andamento → concluído). Substitui o cronômetro que
 * vivia só no navegador: o aluno troca de aparelho ou recarrega a página e o bloco continua igual.
 * - "Iniciar" cria o registro do bloco e gera a atividade (uma vez por dia).
 * - Sair no meio: o bloco fica "em andamento" e "Continuar" reabre a MESMA atividade, sem gastar IA.
 * - Concluído (study-completion.ts): o botão some e a API recusa iniciar de novo (409).
 */

type UserRef = Pick<User, "id" | "email">;

/** Bloco ainda preparando a atividade (outro clique em andamento): espera este tempo antes de tentar de novo. */
const PREPARING_MS = 2 * 60_000;

export type RunView = {
  id: string;
  subject: string;
  topic: string;
  type: string;
  method: string;
  plannedMinutes: number;
  status: Exclude<BlockStatus, "pendente">;
  activity: string | null;
  href: string | null;
  blockKey: string;
  day: string;
  /** Minutos já registrados (pausas somadas). */
  studiedMinutes: number;
  /** Cronômetro ligado desde (ISO) ou null se pausado. */
  timerStartedAt: string | null;
  completedBy: string | null;
  steps: RoadmapStep[];
  /** Etapa feita (automático ou marcada pelo aluno). */
  checks: boolean[];
  /** Etapa feita por um evento real (não dá para desmarcar). */
  autoChecks: boolean[];
  /** Hora do servidor, para o cronômetro do navegador corrigir a diferença de relógio. */
  serverNow: string;
};

/** O bloco é um dos blocos de hoje no plano ativo? (só os de hoje podem ser iniciados) */
async function findTodayBlock(userId: string, block: StudyBlockInput) {
  const plan = await getPrisma().studyPlan.findFirst({ where: { userId, status: "active" }, orderBy: { createdAt: "desc" }, select: { planData: true } });
  const key = blockKey(block);
  const match = getTodayPlanBlocks(parseStudyPlan(plan?.planData)).find((item) => blockKey(item) === key);
  return match ?? null;
}

/** A atividade aberta pelo bloco terminou? */
async function isActivityDone(run: StudyBlockRun) {
  const prisma = getPrisma();
  switch (run.activity) {
    case "quiz":
    case "simulado": {
      if (!run.activityId) return false;
      const quiz = await prisma.quiz.findFirst({ where: { id: run.activityId, userId: run.userId }, select: { completedAt: true } });
      return Boolean(quiz?.completedAt);
    }
    case "flashcards": {
      if (!run.activityId) return false;
      const [total, reviewed] = await Promise.all([
        prisma.flashcard.count({ where: { deckId: run.activityId, deck: { userId: run.userId } } }),
        prisma.flashcard.count({ where: { deckId: run.activityId, deck: { userId: run.userId }, lastReviewedAt: { gte: run.startedAt } } }),
      ]);
      return total > 0 && reviewed >= total;
    }
    case "redacao": {
      const essays = await prisma.essay.count({ where: { userId: run.userId, createdAt: { gte: run.startedAt }, score: { not: null } } });
      return essays > 0;
    }
    case "banco": {
      if (!run.activityId) return false;
      const session = await prisma.bankSession.findFirst({ where: { id: run.activityId, userId: run.userId }, select: { finishedAt: true } });
      return Boolean(session?.finishedAt);
    }
    default:
      return false;
  }
}

/** Registra o trecho do cronômetro como tempo de estudo (vale para a meta do dia e a trilha). */
async function recordSegment(run: StudyBlockRun, minutes: number) {
  if (minutes < 1) return;
  await getPrisma().studySession.create({
    data: { userId: run.userId, subject: run.subject, durationMinutes: minutes, method: run.method || "Plano", notes: run.topic || undefined },
  });
}

/**
 * Confere se o bloco em andamento terminou (atividade ou minutos) e grava. Se o cronômetro estava ligado,
 * o trecho é registrado e o cronômetro para. Devolve o registro atualizado.
 */
export async function syncRun(run: StudyBlockRun, now: Date = new Date()): Promise<StudyBlockRun> {
  if (run.status === "concluido") return run;
  const running = segmentMinutes(run.timerStartedAt, now);
  const by = blockCompletion({ plannedMinutes: run.plannedMinutes, studiedMinutes: run.studiedMinutes + running, activityDone: await isActivityDone(run) });
  if (!by) return run;
  // Só conclui uma vez, mesmo com duas abas consultando ao mesmo tempo.
  const updated = await getPrisma().studyBlockRun.updateMany({
    where: { id: run.id, status: "em_andamento" },
    data: { status: "concluido", completedAt: now, completedBy: by, timerStartedAt: null, studiedMinutes: run.studiedMinutes + running },
  });
  if (updated.count) await recordSegment(run, running);
  return (await getPrisma().studyBlockRun.findUnique({ where: { id: run.id } })) ?? run;
}

/** Blocos de hoje do aluno, já conferidos. Chave: blockKey. */
export async function getTodayRuns(userId: string) {
  const runs = await getPrisma().studyBlockRun.findMany({ where: { userId, day: dayKeySP() } });
  const synced = await Promise.all(runs.map((run) => syncRun(run)));
  return new Map(synced.map((run) => [run.blockKey, run]));
}

/** Para (pausa) o cronômetro de outros blocos, registrando o tempo: só um bloco corre por vez. */
async function pauseOthers(userId: string, exceptId: string | null) {
  const running = await getPrisma().studyBlockRun.findMany({ where: { userId, timerStartedAt: { not: null }, ...(exceptId ? { id: { not: exceptId } } : {}) } });
  for (const run of running) await pauseRun(userId, run.id, { record: true });
}

/**
 * "Iniciar" ou "Continuar" um bloco de hoje. Concluído: 409. Em andamento: reabre a mesma atividade (sem IA).
 * Novo: registra o bloco e gera a atividade (gasta o limite do plano, como antes).
 */
export async function startBlockRun(user: UserRef, input: StudyBlockInput) {
  const prisma = getPrisma();
  const planned = await findTodayBlock(user.id, input);
  if (!planned) throw new StudyStartError("Este bloco não é de hoje. Só os blocos do dia podem ser iniciados.", 400);

  const day = dayKeySP();
  const key = blockKey(input);
  let run = await prisma.studyBlockRun.findUnique({ where: { userId_day_blockKey: { userId: user.id, day, blockKey: key } } });
  if (run) run = await syncRun(run);
  if (run?.status === "concluido") throw new StudyStartError("Este bloco já foi concluído hoje.", 409);

  await pauseOthers(user.id, run?.id ?? null);

  if (run?.href) {
    const resumed = await prisma.studyBlockRun.update({ where: { id: run.id }, data: { timerStartedAt: run.timerStartedAt ?? new Date() } });
    return { href: resumed.href!, activity: resumed.activity, reused: true, runId: resumed.id };
  }
  if (run && Date.now() - run.updatedAt.getTime() < PREPARING_MS) {
    throw new StudyStartError("Este bloco já está sendo preparado. Espere alguns segundos.", 409);
  }

  if (!run) {
    try {
      run = await prisma.studyBlockRun.create({
        data: {
          userId: user.id,
          day,
          blockKey: key,
          subject: planned.subject,
          topic: planned.topic ?? "",
          type: planned.type,
          method: planned.method ?? "",
          plannedMinutes: Math.max(5, planned.durationMinutes || 30),
          timerStartedAt: new Date(),
        },
      });
    } catch {
      // Dois cliques ao mesmo tempo: o outro já criou o registro.
      throw new StudyStartError("Este bloco já está sendo preparado. Espere alguns segundos.", 409);
    }
  } else {
    run = await prisma.studyBlockRun.update({ where: { id: run.id }, data: { timerStartedAt: new Date() } });
  }

  let started;
  try {
    started = await startStudyBlockForUser(user, { ...input, subject: planned.subject, topic: planned.topic ?? "", type: planned.type });
  } catch (error) {
    // Não conseguiu preparar a atividade (limite do dia, IA fora do ar): o bloco volta a "pendente" em vez de
    // ficar preso em "em andamento" sem atividade (antes, "Continuar" respondia 409 por 2 minutos).
    await prisma.studyBlockRun.deleteMany({ where: { id: run.id, href: null } });
    throw error;
  }
  await prisma.studyBlockRun.update({
    where: { id: run.id },
    data: { href: started.href, activity: started.activity, activityId: started.activityId ?? null },
  });
  return { ...started, runId: run.id };
}

/** Pausa o cronômetro do bloco. `record`: soma o trecho no tempo estudado (falso = descartar o trecho). */
export async function pauseRun(userId: string, runId: string, options: { record: boolean }) {
  const prisma = getPrisma();
  const run = await prisma.studyBlockRun.findFirst({ where: { id: runId, userId } });
  if (!run) return null;
  if (!run.timerStartedAt) return syncRun(run);
  const minutes = options.record ? segmentMinutes(run.timerStartedAt) : 0;
  const updated = await prisma.studyBlockRun.updateMany({
    where: { id: run.id, timerStartedAt: run.timerStartedAt },
    data: { timerStartedAt: null, studiedMinutes: run.studiedMinutes + minutes },
  });
  if (updated.count) await recordSegment(run, minutes);
  const fresh = await prisma.studyBlockRun.findUnique({ where: { id: run.id } });
  return fresh ? syncRun(fresh) : null;
}

/**
 * O aluno marca (ou desmarca) uma etapa que já fez por conta própria, como "preparar o ambiente".
 * Etapas marcadas por evento real continuam marcadas. Não conclui o bloco: isso segue a regra de study-completion.
 */
export async function toggleRunStep(userId: string, runId: string, step: number) {
  const prisma = getPrisma();
  const run = await prisma.studyBlockRun.findFirst({ where: { id: runId, userId } });
  if (!run) return null;
  const steps = buildRoadmap({ type: run.type, subject: run.subject, topic: run.topic, plannedMinutes: run.plannedMinutes });
  if (!Number.isInteger(step) || step < 0 || step >= steps.length) throw new StudyStartError("Etapa inválida.", 400);
  const next = toggleManualCheck(parseManualChecks(run.manualChecks, steps.length), step);
  return prisma.studyBlockRun.update({ where: { id: run.id }, data: { manualChecks: next } });
}

/** Eventos do bloco para o roteiro: tempo, atividade, revisões e anotação. */
async function runEvents(run: StudyBlockRun, now: Date) {
  const prisma = getPrisma();
  const [activityDone, cardsReviewed, questionsReviewed, cardsDue, questionsDue, notes] = await Promise.all([
    run.status === "concluido" ? Promise.resolve(true) : isActivityDone(run),
    prisma.flashcard.count({ where: { deck: { userId: run.userId }, lastReviewedAt: { gte: run.startedAt } } }),
    prisma.questionReview.count({ where: { userId: run.userId, lastReviewedAt: { gte: run.startedAt } } }),
    prisma.flashcard.count({ where: { deck: { userId: run.userId }, nextReview: { lte: now } } }),
    prisma.questionReview.count({ where: { userId: run.userId, nextReview: { lte: now } } }),
    prisma.note.count({ where: { userId: run.userId, blockDay: run.day, blockKey: run.blockKey } }),
  ]);
  return {
    minutes: run.studiedMinutes + segmentMinutes(run.timerStartedAt, now),
    activityDone,
    reviewsDone: cardsReviewed + questionsReviewed,
    reviewsDue: cardsDue + questionsDue,
    noteWritten: notes > 0,
    completed: run.status === "concluido",
  };
}

export async function toRunView(run: StudyBlockRun, now: Date = new Date()): Promise<RunView> {
  const steps = buildRoadmap({ type: run.type, subject: run.subject, topic: run.topic, plannedMinutes: run.plannedMinutes, practiceHref: run.href ?? undefined });
  const autoChecks = roadmapChecks(steps, await runEvents(run, now));
  const manual = new Set(parseManualChecks(run.manualChecks, steps.length));
  const checks = autoChecks.map((auto, index) => auto || manual.has(index));
  return {
    id: run.id,
    subject: run.subject,
    topic: run.topic,
    type: run.type,
    method: run.method,
    plannedMinutes: run.plannedMinutes,
    status: run.status === "concluido" ? "concluido" : "em_andamento",
    activity: run.activity,
    href: run.href,
    blockKey: run.blockKey,
    day: run.day,
    studiedMinutes: run.studiedMinutes,
    timerStartedAt: run.timerStartedAt?.toISOString() ?? null,
    completedBy: run.completedBy,
    steps,
    checks,
    autoChecks,
    serverNow: now.toISOString(),
  };
}

/**
 * Bloco que o painel do roteiro mostra: o de cronômetro ligado; senão, o último mexido hoje que ainda está
 * em andamento ou que acabou de ser concluído (para o aluno ver o check final). Nenhum: null.
 */
export async function getPanelRun(userId: string): Promise<RunView | null> {
  const prisma = getPrisma();
  const running = await prisma.studyBlockRun.findFirst({ where: { userId, timerStartedAt: { not: null } }, orderBy: { updatedAt: "desc" } });
  if (running) {
    const synced = await syncRun(running);
    return toRunView(synced);
  }
  const recent = await prisma.studyBlockRun.findFirst({
    where: { userId, day: dayKeySP(), updatedAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    orderBy: { updatedAt: "desc" },
  });
  if (!recent) return null;
  const synced = await syncRun(recent);
  // Pausado e não concluído: o plano mostra "Continuar"; o painel só aparece com o cronômetro ligado.
  if (synced.status !== "concluido") return null;
  return toRunView(synced);
}
