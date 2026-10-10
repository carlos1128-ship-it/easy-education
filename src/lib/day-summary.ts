import { Type, type Schema } from "@google/genai";
import { generateJSON } from "@/lib/gemini";
import { getLearnerPromptProfile, learnerPromptBlock } from "@/lib/exam-style";
import { getPrisma } from "@/lib/prisma";
import { dayKeySP } from "@/lib/study-completion";
import { startOfDaySP } from "@/lib/time-window";

/**
 * Fechar o dia (item 1.7): o aluno escreve o que estudou, com as próprias palavras, e a IA corrige comparando
 * com o que ele FEZ no dia (blocos, assuntos e erros nos quizzes). É opcional: não mexe na ofensiva.
 */

export { SUMMARY_MAX_CHARS, SUMMARY_MIN_CHARS, daySummarySchema, describeStudied, hasStudied, normalizeFeedback, type DaySummaryFeedback, type StudiedToday } from "@/lib/day-summary-rules";
import { describeStudied, normalizeFeedback, type DaySummaryFeedback, type StudiedToday } from "@/lib/day-summary-rules";

function optionText(options: unknown, letter: string) {
  const list = Array.isArray(options) ? options.map(String) : [];
  return list.find((option) => option.trim().toUpperCase().startsWith(`${letter})`))?.replace(/^[A-E]\)\s*/, "") ?? letter;
}

/** Junta o que o aluno fez hoje (horário de Brasília), sem IA. */
export async function collectStudiedToday(userId: string, now: Date = new Date()): Promise<StudiedToday> {
  const prisma = getPrisma();
  const since = startOfDaySP(now);
  const [runs, quizzes, sessions, cards] = await Promise.all([
    prisma.studyBlockRun.findMany({ where: { userId, day: dayKeySP(now) }, select: { subject: true, topic: true, type: true, status: true } }),
    prisma.quiz.findMany({
      where: { userId, completedAt: { gte: since } },
      select: { title: true, subject: true, score: true, questions: { where: { isCorrect: false }, select: { question: true, options: true, correctAnswer: true }, take: 8 } },
      take: 10,
    }),
    prisma.studySession.findMany({ where: { userId, date: { gte: since } }, select: { subject: true, durationMinutes: true } }),
    prisma.flashcard.count({ where: { deck: { userId }, lastReviewedAt: { gte: since } } }),
  ]);
  const minutesBySubject: Record<string, number> = {};
  for (const session of sessions) minutesBySubject[session.subject] = (minutesBySubject[session.subject] ?? 0) + session.durationMinutes;
  return {
    blocks: runs.map((run) => ({ subject: run.subject, topic: run.topic, type: run.type, done: run.status === "concluido" })),
    quizzes: quizzes.map((quiz) => ({ title: quiz.title, subject: quiz.subject, score: quiz.score })),
    mistakes: quizzes
      .flatMap((quiz) => quiz.questions.map((question) => ({ subject: quiz.subject, question: question.question.replace(/\s+/g, " ").slice(0, 220), correct: optionText(question.options, question.correctAnswer).slice(0, 160) })))
      .slice(0, 15),
    minutesBySubject,
    flashcardsReviewed: cards,
  };
}

const schema: Schema = {
  type: Type.OBJECT,
  properties: {
    overview: { type: Type.STRING },
    correct: { type: Type.ARRAY, items: { type: Type.STRING } },
    wrong: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { excerpt: { type: Type.STRING }, fix: { type: Type.STRING } }, required: ["excerpt", "fix"] } },
    missing: { type: Type.ARRAY, items: { type: Type.STRING } },
    review: { type: Type.ARRAY, items: { type: Type.STRING } },
    cards: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { front: { type: Type.STRING }, back: { type: Type.STRING } }, required: ["front", "back"] } },
  },
  required: ["overview", "correct", "wrong", "missing", "review", "cards"],
  propertyOrdering: ["overview", "correct", "wrong", "missing", "review", "cards"],
};

/** Corrige o resumo com a IA. Chame dentro de withFeature(user, "day_summary", ...). */
export async function correctDaySummary(userId: string, content: string, studied: StudiedToday): Promise<DaySummaryFeedback> {
  const learner = await getLearnerPromptProfile(userId);
  const raw = await generateJSON<unknown>(
    `Você é um professor corrigindo o resumo que um aluno escreveu para fechar o dia de estudos.

O que o aluno FEZ hoje no app (dados reais):
${describeStudied(studied)}

Resumo do aluno:
"""
${content}
"""

Regras:
- Avalie só o que está no resumo e só os assuntos que o aluno estudou hoje (lista acima). Não ensine assunto que ele não estudou nem invente atividades.
- correct: o que ele explicou certo (frases curtas).
- wrong: cada afirmação errada, com o trecho do aluno (excerpt) e a correção (fix). Corrija só erros de conteúdo, não de estilo.
- missing: pontos importantes dos assuntos de hoje que ficaram de fora ou incompletos, principalmente os ligados às questões que ele errou.
- review: o que revisar amanhã, em ordem de prioridade (até 4 itens).
- cards: um flashcard (front = pergunta, back = resposta certa e curta) para cada conceito que ele escreveu ERRADO. Vazio se não errou nada.
- overview: uma frase de abertura, encorajadora e honesta, em português do Brasil, falando com o aluno ("você").
- Se tiver dúvida se algo está errado, não marque como erro.${learnerPromptBlock(learner)}
Responda em JSON.`,
    { schema, temperature: 0.2, thinkingBudget: 512 },
  );
  return normalizeFeedback(raw);
}
