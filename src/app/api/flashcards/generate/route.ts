import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { flashcardGenerateSchema } from "@/lib/validators";
import type { GeneratedFlashcard } from "@/types";

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeFlashcards(rawCards: unknown, count: number) {
  const seen = new Set<string>();
  const cards = (Array.isArray(rawCards) ? rawCards : [])
    .map((item) => {
      const card = item as Partial<GeneratedFlashcard>;
      return {
        front: cleanText(card.front),
        back: cleanText(card.back),
      };
    })
    .filter((card) => {
      const key = card.front.toLowerCase();
      const normalized = normalizeForMatch(`${card.front} ${card.back}`);
      const placeholder = /revise .*anote a definicao principal|card \d+: qual ponto essencial/.test(normalized);
      if (!card.front || !card.back || placeholder || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);

  if (cards.length < count) {
    throw new Error("A IA retornou poucos flashcards validos.");
  }

  return cards;
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`flashcards:${user.id}`).ok) return NextResponse.json({ error: "Limite atingido." }, { status: 429 });

    const payload = flashcardGenerateSchema.parse(await request.json());
    const prisma = getPrisma();
    const file = payload.fileId ? await prisma.uploadedFile.findFirst({ where: { id: payload.fileId, userId: user.id } }) : null;
    const topic = payload.topic ?? file?.textContent?.slice(0, 6000) ?? payload.subject;
    const prompt = `Crie exatamente ${payload.count} flashcards de estudo ativo sobre "${topic}" para a materia ${payload.subject}.
Regras obrigatorias:
- O front deve ser uma pergunta objetiva que o aluno consiga tentar responder sem ver o verso.
- O back deve responder diretamente a pergunta, com explicacao curta e concreta.
- Nao use comandos como "revise", "anote", "pesquise" ou frases genericas; gere pergunta e resposta prontas.
- Nao repita cards nem mude apenas poucas palavras.
Retorne APENAS um array JSON valido com front e back.`;
    const cards = normalizeFlashcards(await generateJSON<GeneratedFlashcard[]>(prompt), payload.count);
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
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "flashcards.generate",
      fallback: "Nao foi possivel gerar os flashcards.",
    });
  }
}
