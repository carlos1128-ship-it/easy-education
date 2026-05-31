import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { flashcardGenerateSchema } from "@/lib/validators";
import type { GeneratedFlashcard } from "@/types";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!checkRateLimit(`flashcards:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

  const payload = flashcardGenerateSchema.parse(await request.json());
  const prisma = getPrisma();
  const file = payload.fileId ? await prisma.uploadedFile.findFirst({ where: { id: payload.fileId, userId: user.id } }) : null;
  const topic = payload.topic ?? file?.textContent?.slice(0, 6000) ?? payload.subject;
  const prompt = `Crie ${payload.count} flashcards sobre "${topic}". Para cada card, retorne um JSON com: front (pergunta ou conceito), back (resposta ou definicao completa). Foque nos pontos mais importantes. Responda APENAS com um array JSON valido.`;
  const cards = await generateJSON<GeneratedFlashcard[]>(prompt);
  const deck = await prisma.flashcardDeck.create({
    data: {
      userId: user.id,
      title: payload.title,
      subject: payload.subject,
      flashcards: { create: cards.map((card) => ({ front: card.front, back: card.back })) },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/flashcards");
  revalidatePath("/dashboard/desempenho");

  return NextResponse.json({ deckId: deck.id });
}
