import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { createFlashcardDeckForUser } from "@/lib/flashcard-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { flashcardGenerateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`flashcards:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = flashcardGenerateSchema.parse(await request.json());
    const deck = await createFlashcardDeckForUser({ userId: user.id, ...payload });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/flashcards");
    revalidatePath("/dashboard/desempenho");

    return NextResponse.json({ deckId: deck.id });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "flashcards.generate",
      fallback: "Não foi possível gerar os flashcards.",
    });
  }
}
