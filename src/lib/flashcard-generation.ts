import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import type { GeneratedFlashcard } from "@/types";

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

export type FlashcardGenerationInput = {
  userId: string;
  title: string;
  subject: string;
  topic?: string;
  fileId?: string;
  count: number;
};

/** Gera um deck de flashcards com a IA e salva no banco. Usado pela tela de flashcards e pelo chat. */
export async function createFlashcardDeckForUser(input: FlashcardGenerationInput) {
  const prisma = getPrisma();
  const file = input.fileId ? await prisma.uploadedFile.findFirst({ where: { id: input.fileId, userId: input.userId } }) : null;
  const topic = input.topic ?? file?.textContent?.slice(0, 6000) ?? input.subject;
  const prompt = `Crie exatamente ${input.count} flashcards de estudo ativo sobre "${topic}" para a materia ${input.subject}.
Regras obrigatorias:
- O front deve ser uma pergunta objetiva que o aluno consiga tentar responder sem ver o verso.
- O back deve responder diretamente a pergunta, com explicacao curta e concreta.
- Nao use comandos como "revise", "anote", "pesquise" ou frases genericas; gere pergunta e resposta prontas.
- Nao repita cards nem mude apenas poucas palavras.
Retorne APENAS um array JSON valido com front e back.`;
  const cards = normalizeFlashcards(await generateJSON<GeneratedFlashcard[]>(prompt), input.count);

  return prisma.flashcardDeck.create({
    data: {
      userId: input.userId,
      title: input.title,
      subject: input.subject,
      flashcards: { create: cards.map((card) => ({ front: card.front, back: card.back })) },
    },
  });
}
