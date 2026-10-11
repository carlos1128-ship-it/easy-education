import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { addReadyDeckBySlug } from "@/lib/ready-flashcards";
import { requireTier } from "@/lib/usage";

const schema = z.object({ slug: z.string().min(2).max(80) });

/** Adiciona um baralho pronto às revisões do aluno. Sem IA e sem gastar limite (precisa de plano ativo). */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`flashcards-ready:${user.id}`, 30, 60_000).ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
    await requireTier(user);
    const { slug } = schema.parse(await request.json());
    const deck = await addReadyDeckBySlug(user.id, slug);
    if (!deck) return NextResponse.json({ error: "Baralho não encontrado." }, { status: 404 });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/flashcards");
    return NextResponse.json({ deckId: deck.id });
  } catch (error) {
    return apiErrorResponse(error, { scope: "flashcards.ready", fallback: "Não foi possível adicionar o baralho." });
  }
}
