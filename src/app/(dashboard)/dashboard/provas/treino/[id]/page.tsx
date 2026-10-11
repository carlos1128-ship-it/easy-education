import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PracticeRunner } from "@/components/bank/practice-runner";
import { PAST_EXAMS } from "@/lib/bank/constants";
import { examHref, PROVAS_HREF, sessionHref } from "@/lib/bank/paths";
import { isPastExam } from "@/lib/bank/past-exams";
import { getSessionForUser, toClientQuestion, toLockedClientQuestion, toReveal } from "@/lib/bank/service";
import { isUltrasecret, topKeysForExam, ultrasecretLocked } from "@/lib/bank/ultrasecret";
import { getStudentOrRedirect } from "@/lib/server-user";

export const metadata: Metadata = { title: "Treino · Provas anteriores · Easy Education" };
export const dynamic = "force-dynamic";

export default async function TreinoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, access } = await getStudentOrRedirect();
  const { id } = await params;
  const loaded = await getSessionForUser(user.id, id);
  if (!loaded) notFound();
  const { session, questions } = loaded;
  if (session.kind !== "practice") redirect(sessionHref(id));

  const examSlug = session.exam?.slug ?? "";
  const examName = isPastExam(examSlug) ? PAST_EXAMS[examSlug].short : (session.exam?.name ?? "prova");
  const top = examSlug ? await topKeysForExam(examSlug) : [];
  const locked = ultrasecretLocked(access.tier);
  const answered = new Map(session.answers.map((answer) => [answer.questionId, answer]));

  const clientQuestions = questions.map((question) => {
    const secret = isUltrasecret(question, top);
    // Trancada só se ainda não foi respondida (quem respondeu no Completo continua vendo).
    if (secret && locked && !answered.has(question.id)) return toLockedClientQuestion(question);
    return { ...toClientQuestion(question), ultrasecret: secret };
  });
  const initialAnswers = Object.fromEntries(
    questions.flatMap((question) => {
      const answer = answered.get(question.id);
      return answer ? [[question.id, { selected: answer.selected, isCorrect: answer.isCorrect, reveal: toReveal(question) }]] : [];
    }),
  );
  // O título é "FUVEST · Matemática": a matéria do treino volta para "Treinar de novo".
  const subjectSlug = questions.every((question) => question.subject?.slug === questions[0]?.subject?.slug) && !session.title.endsWith("Todas as matérias") ? questions[0]?.subject?.slug : undefined;

  return (
    <PracticeRunner
      sessionId={session.id}
      title={session.title}
      examName={examName}
      questions={clientQuestions}
      initialAnswers={initialAnswers}
      backHref={isPastExam(examSlug) ? examHref(examSlug, subjectSlug) : PROVAS_HREF}
      againBody={{ exam: examSlug, subject: subjectSlug }}
    />
  );
}
