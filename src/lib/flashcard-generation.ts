import { Type, type Schema } from "@google/genai";
import { generateJSONList } from "@/lib/gemini";
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

const flashcardsSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
    required: ["front", "back"],
    propertyOrdering: ["front", "back"],
  },
};

/** Cards são curtos: 10 por parte, todas as partes ao mesmo tempo. */
const FLASHCARD_CHUNK_SIZE = 10;

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

  // Uma parte pode falhar no prazo: aceita a partir de 70% do pedido em vez de perder tudo.
  if (cards.length < Math.min(count, Math.max(3, Math.ceil(count * 0.7)))) {
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
  const buildPrompt = (count: number, part: number, parts: number) => `Crie exatamente ${count} flashcards de estudo ativo sobre "${topic}" para a materia ${input.subject}.
Regras obrigatorias:
- O front deve ser uma pergunta objetiva que o aluno consiga tentar responder sem ver o verso.
- O back deve responder diretamente a pergunta, com explicacao curta e concreta.
- Nao use comandos como "revise", "anote", "pesquise" ou frases genericas; gere pergunta e resposta prontas.
- Nao repita cards nem mude apenas poucas palavras.${parts > 1 ? `\n- Esta e a parte ${part} de ${parts} do mesmo deck: cubra a ${part}a fatia do conteudo (do mais basico ao mais avancado), sem repetir outras partes.` : ""}
Retorne APENAS um array JSON valido com front e back.`;
  const rawCards = await generateJSONList<GeneratedFlashcard>({
    total: input.count,
    chunkSize: FLASHCARD_CHUNK_SIZE,
    schema: flashcardsSchema,
    buildPrompt,
    dedupeKey: (card) => normalizeForMatch(cleanText(card.front)),
  });
  const cards = normalizeFlashcards(rawCards, input.count);

  return prisma.flashcardDeck.create({
    data: {
      userId: input.userId,
      title: input.title,
      subject: input.subject,
      flashcards: { create: cards.map((card) => ({ front: card.front, back: card.back })) },
    },
  });
}
