import { z } from "zod";

/**
 * Anotações do aluno. Não gastam IA. Cada anotação pode ficar solta ou ligada a um lugar do app
 * (matéria, assunto, bloco do plano, quiz, questão ou arquivo), para reaparecer onde foi escrita.
 */

export const NOTE_MAX_CHARS = 5000;

const id = z.string().trim().min(1).max(64);

/** Onde a anotação foi escrita. Tudo opcional: anotação solta também vale. */
export const noteLinkSchema = z.object({
  subject: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(300).optional(),
  blockDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  blockKey: z.string().trim().max(300).optional(),
  quizId: id.optional(),
  questionId: id.optional(),
  questionKind: z.enum(["quiz", "banco"]).optional(),
  fileId: id.optional(),
});

export type NoteLink = z.infer<typeof noteLinkSchema>;

export const noteCreateSchema = noteLinkSchema.extend({
  content: z.string().trim().min(1, "Escreva alguma coisa.").max(NOTE_MAX_CHARS, `Use no máximo ${NOTE_MAX_CHARS} caracteres.`),
});

export const noteUpdateSchema = z.object({
  content: z.string().trim().min(1, "Escreva alguma coisa.").max(NOTE_MAX_CHARS, `Use no máximo ${NOTE_MAX_CHARS} caracteres.`),
});

/** Filtro de busca a partir da URL (?subject=...&blockKey=...). Ignora o que não é campo de ligação. */
export function noteFilterFromParams(params: URLSearchParams): NoteLink {
  const raw = Object.fromEntries([...params.entries()].filter(([key]) => key in noteLinkSchema.shape));
  const parsed = noteLinkSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/** Rótulo de onde a anotação foi feita ("Bloco do plano · Física", "Questão de quiz"...). */
export function noteContextLabel(note: { subject?: string | null; topic?: string | null; blockKey?: string | null; quizId?: string | null; questionId?: string | null; fileId?: string | null }) {
  const place = note.blockKey ? "Bloco do plano" : note.questionId ? "Questão" : note.quizId ? "Quiz" : note.fileId ? "Arquivo" : null;
  const what = [note.subject, note.topic].filter(Boolean).join(" · ");
  return [place, what].filter(Boolean).join(" · ") || "Anotação livre";
}
