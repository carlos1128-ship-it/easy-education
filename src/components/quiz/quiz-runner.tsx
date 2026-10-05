"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuizOption, type QuizOptionState } from "@/components/ui/quiz-option";
import { OwlMascot, usePreloadOwls, type OwlMood } from "@/components/mascot/owl-mascot";
import { Check, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound, primeSounds, useSoundsEnabled } from "@/lib/sounds";
import type { QuizRunnerQuestion } from "@/lib/quiz-questions";

type QuizRunnerProps = {
  quizId: string;
  questions: QuizRunnerQuestion[];
  mode?: "quiz" | "simulado";
};

const IDLE_MS = 30_000;

function resultMood(percent: number): { mood: OwlMood; message: string } {
  if (percent === 100) return { mood: "apaixonada", message: "Gabaritou! Todas certas." };
  if (percent >= 70) return { mood: "comemorando", message: "Mandou muito bem!" };
  if (percent >= 50) return { mood: "feliz", message: "Bom resultado. Revise os erros para subir mais." };
  return { mood: "determinada", message: "Vamos revisar os erros e tentar de novo." };
}

function SoundToggle() {
  const [enabled, setEnabled] = useSoundsEnabled();
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label={enabled ? "Desativar sons" : "Ativar sons"}
      title={enabled ? "Desativar sons" : "Ativar sons"}
      className="grid size-9 flex-none place-items-center rounded-full border border-border text-ink-muted hover:bg-surface-muted hover:text-ink"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

export function QuizRunner({ quizId, questions, mode = "quiz" }: QuizRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.filter((item) => item.userAnswer).map((item) => [item.id, item.userAnswer as string])),
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState(0);
  const [sleepyAt, setSleepyAt] = useState(-1);
  const pageSize = mode === "simulado" ? 5 : 1;
  const pageQuestions = questions.slice(index, index + pageSize);
  const answeredCount = questions.filter((item) => answers[item.id]).length;
  const finished = questions.length > 0 && answeredCount === questions.length && index >= questions.length;
  const score = questions.filter((item) => answers[item.id] === item.correctAnswer).length;
  const canGoNext = pageQuestions.every((item) => answers[item.id]);
  const isLastPage = index + pageSize >= questions.length;

  usePreloadOwls(isLastPage ? ["comemorando", "apaixonada", "determinada"] : ["piscando", "feliz", "determinada"]);

  // Sem interação por um tempo, a coruja fica sonolenta.
  useEffect(() => {
    if (finished) return;
    const timer = window.setTimeout(() => setSleepyAt(activity), IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [activity, finished]);

  const touch = () => setActivity((value) => value + 1);

  async function confirmAnswer(question: QuizRunnerQuestion) {
    const answer = drafts[question.id];
    if (!answer || answers[question.id]) return null;
    setSaving(true);
    const response = await fetch(`/api/quiz/${quizId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answer }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error(response.status === 409 ? "Essa resposta já foi confirmada." : "Não foi possível salvar a resposta.");
      return null;
    }
    setAnswers((current) => ({ ...current, [question.id]: answer }));
    return answer === question.correctAnswer;
  }

  async function confirmPage() {
    primeSounds();
    touch();
    const results: boolean[] = [];
    for (const item of pageQuestions) {
      if (!answers[item.id] && drafts[item.id]) {
        const result = await confirmAnswer(item);
        if (result !== null) results.push(result);
      }
    }
    if (!results.length) return;
    const correct = results.filter(Boolean).length;
    void playSound(correct >= results.length - correct ? "acerto" : "erro");
  }

  function goNext() {
    touch();
    if (isLastPage) {
      primeSounds();
      void playSound("concluido");
    }
    setIndex((value) => value + pageSize);
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
    const percent = Math.round((score / questions.length) * 100);
    const result = resultMood(percent);
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <OwlMascot mood={result.mood} size={176} />
          <div>
            <h1 className="text-2xl font-bold text-ink">Resultado</h1>
            <p className="mt-3 text-4xl font-extrabold text-brand">{percent}%</p>
            <p className="mt-2 text-ink-muted">
              {score} de {questions.length} questões corretas.
            </p>
            <p className="mt-1 font-medium text-ink">{result.message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
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

  const pageConfirmed = pageQuestions.filter((item) => answers[item.id]);
  const pageCorrect = pageConfirmed.filter((item) => answers[item.id] === item.correctAnswer).length;
  const hasDraft = pageQuestions.some((item) => !answers[item.id] && drafts[item.id]);
  let streak = 0;
  for (let k = index; k >= 0 && answers[questions[k].id] === questions[k].correctAnswer; k--) streak++;

  let mood: OwlMood = "atenta";
  let message = mode === "simulado" ? "Leia com calma e marque as alternativas." : "Leia com calma e escolha uma alternativa.";
  if (pageConfirmed.length && mode === "simulado") {
    const good = pageCorrect >= pageConfirmed.length - pageCorrect;
    mood = good ? "feliz" : "determinada";
    message = `${pageCorrect} de ${pageConfirmed.length} certas nesta página.${good ? "" : " Leia as explicações."}`;
  } else if (pageConfirmed.length) {
    if (pageCorrect && streak >= 3) {
      mood = "comemorando";
      message = `${streak} acertos seguidos!`;
    } else if (pageCorrect) {
      mood = "feliz";
      message = "Acertou!";
    } else {
      mood = "determinada";
      message = "Não foi dessa vez. Leia a explicação.";
    }
  } else if (hasDraft) {
    mood = "piscando";
    message = mode === "simulado" ? "Marque todas e confirme a página." : "Confirme quando tiver certeza.";
  } else if (sleepyAt === activity) {
    mood = "sonolenta";
    message = "Ainda por aí? Escolha uma alternativa quando quiser.";
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-10">
      <aside className="flex flex-wrap items-center justify-between gap-4 lg:sticky lg:top-0 lg:flex-col lg:items-start lg:self-start">
        <OwlMascot mood={mood} message={message} size={120} />
        <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:w-full">
          <div className="flex flex-col items-end gap-2 lg:flex-1 lg:items-start">
            <span className="text-sm text-ink-muted">
              {mode === "simulado" ? `Questões ${index + 1}-${Math.min(index + pageSize, questions.length)}` : `Questão ${index + 1}`} de {questions.length}
            </span>
            <Progress value={(answeredCount / questions.length) * 100} className="w-40 lg:w-full" />
          </div>
          <SoundToggle />
        </div>
      </aside>

      <div className="min-w-0">
      <div className="space-y-6">
        {pageQuestions.map((question, questionIndex) => {
          const options = question.options;
          const confirmed = answers[question.id];
          const selected = confirmed ?? drafts[question.id];
          return (
            <section key={question.id} className="rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-7">
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
                      onClick={() => {
                        primeSounds();
                        touch();
                        setDrafts((current) => ({ ...current, [question.id]: letter }));
                      }}
                      className={cn(confirmed && state === "default" && "opacity-60")}
                    >
                      {text}
                    </QuizOption>
                  );
                })}
              </div>
              {confirmed ? (
                <div className={cn("mt-5 border-l-4 pl-4 text-[13px] leading-5", confirmed === question.correctAnswer ? "border-success" : "border-danger")}>
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

      <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:justify-between">
        <Button
          variant="outline"
          className="order-2 sm:order-none"
          disabled={index === 0 || saving}
          onClick={() => {
            touch();
            setIndex((value) => Math.max(0, value - pageSize));
          }}
        >
          Anterior
        </Button>
        <div className="contents sm:flex sm:gap-2">
          <Button variant="outline" className="order-1 col-span-2 sm:order-none" disabled={saving || pageQuestions.every((item) => answers[item.id])} onClick={confirmPage}>
            {saving ? "Salvando..." : mode === "simulado" ? "Confirmar página" : "Confirmar resposta"}
          </Button>
          <Button className="order-3 rounded-lg bg-brand text-on-brand hover:bg-brand-strong sm:order-none" disabled={!canGoNext || saving} onClick={goNext}>
            {isLastPage ? "Finalizar" : "Próxima"}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
