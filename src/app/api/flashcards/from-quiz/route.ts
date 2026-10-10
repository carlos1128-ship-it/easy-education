import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { FlashcardsFromQuizError, createFlashcardsFromQuiz, findRecentDeck } from "@/lib/quiz-flashcards";
import { checkRateLimit } from "@/lib/rate-limit";
import { withFeature } from "@/lib/usage";

export const maxDuration = 60;

const id = z.string().trim().min(1).max(64);

/** Antes de criar: quantas erradas e se já existe deck recente do mesmo assunto (para oferecer "adicionar"). */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const quizId = id.parse(new URL(request.url).searchParams.get("quizId"));
    const quiz = await getPrisma().quiz.findFirst({ where: { id: quizId, userId: user.id }, select: { subject: true, questions: { select: { isCorrect: true } } } });
    if (!quiz) return NextResponse.json({ error: "Quiz não encontrado." }, { status: 404 });
    const recentDeck = await findRecentDeck(user.id, quiz.subject);
    return NextResponse.json({
      wrong: quiz.questions.filter((question) => question.isCorrect === false).length,
      recentDeck: recentDeck ? { id: recentDeck.id, title: recentDeck.title, cards: recentDeck._count.flashcards } : null,
    });
  } catch (error) {
    return apiErrorResponse(error, { scope: "flashcards.from-quiz.check", fallback: "Não foi possível consultar o quiz." });
  }
}

/** Cria os cartões (gasta 1 deck do limite de flashcards por IA). `deckId`: adiciona ao deck existente. */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`flashcards:${user.id}`).ok) return NextResponse.json({ error: "Muitas gerações em pouco tempo. Espere um minuto." }, { status: 429 });
    const payload = z.object({ quizId: id, deckId: id.nullish() }).parse(await request.json());
    const result = await withFeature(user, "ai_flashcards", () => createFlashcardsFromQuiz({ userId: user.id, quizId: payload.quizId, deckId: payload.deckId }));
    revalidatePath("/dashboard/flashcards");
    revalidatePath("/dashboard");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FlashcardsFromQuizError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error, { scope: "flashcards.from-quiz", fallback: "Não foi possível criar os flashcards." });
  }
}
