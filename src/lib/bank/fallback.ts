import { ORIGIN, slugify } from "@/lib/bank/constants";
import { createSession, pickQuestionIds } from "@/lib/bank/service";
import { isEnemStudent } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";

/**
 * Quando o quiz por IA não está liberado no plano: quando o aluno pede um quiz (no chat ou pelo plano de estudos),
 * quem estuda para o ENEM pratica com questões de provas anteriores do ENEM (por matéria e assunto), sem IA.
 * Para os outros objetivos devolve null: questão do ENEM não serve para quem estuda para concurso, por exemplo.
 */
export async function startBankPractice(userId: string, input: { subject?: string; topic?: string; count?: number }) {
  const prisma = getPrisma();
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { personalization: true } });
  if (!isEnemStudent(profile?.personalization)) return null;
  const subjectText = input.subject?.trim();
  const subject = subjectText
    ? await prisma.bankSubject.findFirst({
        where: { OR: [{ slug: slugify(subjectText) }, { name: { contains: subjectText, mode: "insensitive" } }] },
        select: { id: true, slug: true, name: true },
      })
    : null;
  const topicText = input.topic?.trim();
  const topic =
    subject && topicText
      ? await prisma.bankTopic.findFirst({ where: { subjectId: subject.id, name: { contains: topicText, mode: "insensitive" } }, select: { slug: true, name: true } })
      : null;

  let ids = await pickQuestionIds(userId, { subject: subject?.slug, topic: topic?.slug, origin: ORIGIN.official }, input.count ?? 10);
  // Assunto sem questões: usa a matéria inteira; matéria sem questões: sorteia do banco todo.
  if (!ids.length && topic) ids = await pickQuestionIds(userId, { subject: subject?.slug, origin: ORIGIN.official }, input.count ?? 10);
  if (!ids.length) ids = await pickQuestionIds(userId, { origin: ORIGIN.official }, input.count ?? 10);
  if (!ids.length) return null;

  const label = topic?.name ?? subject?.name ?? "ENEM";
  const session = await createSession({ userId, kind: "practice", title: `Prática: ${label}`, questionIds: ids });
  return { sessionId: session.id, total: ids.length, subject: subject?.name ?? null, topic: topic?.name ?? null, matched: Boolean(subject) };
}
