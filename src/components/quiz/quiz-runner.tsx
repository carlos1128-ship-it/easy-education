"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuizOption, type QuizOptionState } from "@/components/ui/quiz-option";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizRunnerQuestion } from "@/lib/quiz-questions";

type QuizRunnerProps = {
  quizId: string;
  questions: QuizRunnerQuestion[];
  mode?: "quiz" | "simulado";
};

export function QuizRunner({ quizId, questions, mode = "quiz" }: QuizRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.filter((item) => item.userAnswer).map((item) => [item.id, item.userAnswer as string])),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const pageSize = mode === "simulado" ? 5 : 1;
  const pageQuestions = questions.slice(index, index + pageSize);
  const answeredCount = questions.filter((item) => answers[item.id]).length;
  const finished = questions.length > 0 && answeredCount === questions.length && index >= questions.length;
  const score = questions.filter((item) => answers[item.id] === item.correctAnswer).length;
  const canGoNext = pageQuestions.every((item) => answers[item.id]);

  async function confirmAnswer(question: QuizRunnerQuestion) {
    const answer = drafts[question.id];
    if (!answer || answers[question.id]) return;
    setSaving(true);
    const response = await fetch(`/api/quiz/${quizId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answer }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error(response.status === 409 ? "Essa resposta já foi confirmada." : "Não foi possível salvar a resposta.");
      return;
    }
    setAnswers((current) => ({ ...current, [question.id]: answer }));
  }

  async function confirmPage() {
    for (const item of pageQuestions) {
      if (!answers[item.id] && drafts[item.id]) await confirmAnswer(item);
    }
  }

  if (!pageQuestions.length && !finished) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-bold text-ink">Quiz sem questões</h1>
        <p className="mt-2 text-ink-muted">Gere outro quiz para começar a praticar.</p>
        <Link href="/dashboard/quizzes" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand hover:bg-brand-strong">
          Voltar aos quizzes
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h1 className="text-2xl font-bold text-ink">Resultado</h1>
        <p className="mt-3 text-4xl font-bold text-brand-strong">{Math.round((score / questions.length) * 100)}%</p>
        <p className="mt-2 text-ink-muted">
          {score} de {questions.length} questões corretas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="rounded-lg bg-brand text-on-brand hover:bg-brand-strong" onClick={() => setIndex(0)}>
            Revisar respostas
          </Button>
          <Link href="/dashboard/quizzes" className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink hover:bg-surface-muted">
            Ver todos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-ink-muted">
          {mode === "simulado" ? `Questões ${index + 1}-${Math.min(index + pageSize, questions.length)}` : `Questão ${index + 1}`} de {questions.length}
        </span>
        <Progress value={(answeredCount / questions.length) * 100} className="max-w-40" />
      </div>

      <div className="space-y-6">
        {pageQuestions.map((question, questionIndex) => {
          const options = question.options;
          const confirmed = answers[question.id];
          const selected = confirmed ?? drafts[question.id];
          return (
            <section key={question.id} className="rounded-2xl border border-border bg-surface-muted p-4">
              <h2 className="text-[17px] font-medium leading-[26px] text-ink">
                {index + questionIndex + 1}. {question.question}
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {options.map((option) => {
                  const letter = option.slice(0, 1);
                  const text = option.replace(/^[A-Ea-e]\s*[).:-]\s*/, "");
                  const state: QuizOptionState = confirmed
                    ? letter === question.correctAnswer
                      ? "correct"
                      : letter === confirmed
                        ? "wrong"
                        : "default"
                    : selected === letter
                      ? "selected"
                      : "default";
                  return (
                    <QuizOption
                      key={option}
                      letter={letter}
                      state={state}
                      disabled={Boolean(confirmed) || saving}
                      onClick={() => setDrafts((current) => ({ ...current, [question.id]: letter }))}
                      className={cn(confirmed && state === "default" && "opacity-60")}
                    >
                      {text}
                    </QuizOption>
                  );
                })}
              </div>
              {confirmed ? (
                <div className="mt-5 rounded-lg bg-surface p-4 text-[13px] leading-5">
                  <p className={cn("flex items-center gap-1.5 font-medium", confirmed === question.correctAnswer ? "text-success" : "text-danger")}>
                    {confirmed === question.correctAnswer ? (
                      <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
                    )}
                    {confirmed === question.correctAnswer ? "Você acertou." : `Errou. Resposta correta: ${question.correctAnswer}`}
                  </p>
                  <p className="mt-2 text-ink-muted">{question.explanation}</p>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" disabled={index === 0 || saving} onClick={() => setIndex((value) => Math.max(0, value - pageSize))}>
          Anterior
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving || pageQuestions.every((item) => answers[item.id])} onClick={confirmPage}>
            {saving ? "Salvando..." : mode === "simulado" ? "Confirmar página" : "Confirmar resposta"}
          </Button>
          <Button className="rounded-lg bg-brand text-on-brand hover:bg-brand-strong" disabled={!canGoNext || saving} onClick={() => setIndex((value) => value + pageSize)}>
            {index + pageSize >= questions.length ? "Finalizar" : "Próxima"}
          </Button>
        </div>
      </div>
    </div>
  );
}
