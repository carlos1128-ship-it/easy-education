import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { normalizeFeedback } from "@/lib/day-summary";
import { getPrisma } from "@/lib/prisma";
import { dayKeySP } from "@/lib/study-completion";

/**
 * Transforma os conceitos que o aluno escreveu errado no resumo de hoje em flashcards. Os cartões já vieram
 * prontos na correção, então isto não gasta IA. Pedir de novo devolve o mesmo deck.
 */
export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const prisma = getPrisma();
    const day = dayKeySP();
    const summary = await prisma.daySummary.findUnique({ where: { userId_day: { userId: user.id, day } } });
    const cards = normalizeFeedback(summary?.feedback).cards;
    if (!cards.length) return NextResponse.json({ error: "A correção de hoje não apontou conceitos errados." }, { status: 400 });

    const [year, month, date] = day.split("-");
    const title = `Revisão do resumo de ${date}/${month}/${year}`;
    const existing = await prisma.flashcardDeck.findFirst({ where: { userId: user.id, title }, select: { id: true } });
    if (existing) return NextResponse.json({ deckId: existing.id, added: 0 });

    const deck = await prisma.flashcardDeck.create({
      data: { userId: user.id, title, subject: "Resumo do dia", flashcards: { create: cards.map((card) => ({ ...card, sourceKind: "resumo" })) } },
    });
    revalidatePath("/dashboard/flashcards");
    return NextResponse.json({ deckId: deck.id, added: cards.length });
  } catch (error) {
    return apiErrorResponse(error, { scope: "day-summary.flashcards", fallback: "Não foi possível criar os flashcards." });
  }
}
