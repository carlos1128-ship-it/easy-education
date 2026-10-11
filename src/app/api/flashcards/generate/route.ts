import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createFlashcardDeckForUser } from "@/lib/flashcard-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { addReadyDeck, pickReadyDeckFor } from "@/lib/ready-flashcards";
import { PlanLimitError, withFeature } from "@/lib/usage";
import { flashcardGenerateSchema } from "@/lib/validators";

/** O baralho pronto cobre a falta de IA: limite do plano ou teto de custo esgotado, ou erro da IA. */
function readyCanCover(error: unknown) {
  if (error instanceof PlanLimitError) return ["limit_reached", "daily_cap", "monthly_cap"].includes(error.info.code);
  return true;
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`flashcards:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = flashcardGenerateSchema.parse(await request.json());
    let deckId: string;
    try {
      const deck = await withFeature(user, "ai_flashcards", () => createFlashcardDeckForUser({ userId: user.id, ...payload }));
      deckId = deck.id;
    } catch (error) {
      // Material do próprio aluno não tem baralho pronto equivalente.
      if (payload.fileId || !readyCanCover(error)) throw error;
      const ready = await pickReadyDeckFor(user.id, payload.subject, payload.topic ?? payload.title);
      if (!ready) throw error;
      deckId = (await addReadyDeck(user.id, ready)).id;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/flashcards");
    revalidatePath("/dashboard/desempenho");

    return NextResponse.json({ deckId });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "flashcards.generate",
      fallback: "Não foi possível gerar os flashcards.",
    });
  }
}
