"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type QuizQuestion = {
  id: string;
  question: string;
  options: unknown;
  correctAnswer: string;
  explanation: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
};

type QuizRunnerProps = {
  quizId: string;
  questions: QuizQuestion[];
  mode?: "quiz" | "simulado";
};

function normalizeOptions(options: unknown) {
  return Array.isArray(options) ? options.map(String) : [];
}

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

  async function confirmAnswer(question: QuizQuestion) {
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
      <div className="mx-auto max-w-3xl rounded-[20px] border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#0F172A]">Quiz sem questões</h1>
        <p className="mt-2 text-[#64748B]">Gere outro quiz para comecar a praticar.</p>
        <Link href="/dashboard/quizzes" className="mt-6 inline-flex h-9 items-center rounded-xl bg-[#4F46E5] px-4 text-sm font-medium text-white hover:bg-[#4338CA]">
          Voltar aos quizzes
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-3xl rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0F172A]">Resultado</h1>
        <p className="mt-3 text-4xl font-bold text-[#4F46E5]">{Math.round((score / questions.length) * 100)}%</p>
        <p className="mt-2 text-[#64748B]">
          {score} de {questions.length} questões corretas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]" onClick={() => setIndex(0)}>
            Revisar respostas
          </Button>
          <Link href="/dashboard/quizzes" className="inline-flex h-9 items-center rounded-lg border border-input px-4 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC]">
            Ver todos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-[#64748B]">
          {mode === "simulado" ? `Questões ${index + 1}-${Math.min(index + pageSize, questions.length)}` : `Questão ${index + 1}`} de {questions.length}
        </span>
        <Progress value={(answeredCount / questions.length) * 100} className="max-w-40" />
      </div>

      <div className="space-y-6">
        {pageQuestions.map((question, questionIndex) => {
          const options = normalizeOptions(question.options);
          const confirmed = answers[question.id];
          const selected = confirmed ?? drafts[question.id];
          return (
            <section key={question.id} className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <h2 className="text-base font-bold text-[#0F172A]">
                {index + questionIndex + 1}. {question.question}
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {options.map((option) => {
                  const letter = option.slice(0, 1);
                  return (
                    <button
                      type="button"
                      key={option}
                      disabled={Boolean(confirmed) || saving}
                      onClick={() => setDrafts((current) => ({ ...current, [question.id]: letter }))}
                      className={cn(
                        "rounded-xl border border-[#E2E8F0] bg-white p-4 text-left text-[#0F172A] transition-colors hover:border-[#4F46E5]/30 disabled:cursor-not-allowed",
                        selected === letter && "border-[#4F46E5] bg-[#EEF2FF]",
                        confirmed && selected !== letter && "opacity-60",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {confirmed ? (
                <div className="mt-5 rounded-xl bg-white p-4 text-sm">
                  <p className={confirmed === question.correctAnswer ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                    {confirmed === question.correctAnswer ? "Você acertou." : `Resposta correta: ${question.correctAnswer}`}
                  </p>
                  <p className="mt-2 text-[#64748B]">{question.explanation}</p>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {pageQuestions.some((item) => !answers[item.id] && drafts[item.id]) ? (
        <div className="mt-5 rounded-xl bg-[#FFF7ED] p-4 text-sm font-medium text-[#9A3412]">
          Confirme para salvar a resposta. Depois de confirmar, ela fica bloqueada como em uma prova.
        </div>
      ) : null}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" disabled={index === 0 || saving} onClick={() => setIndex((value) => Math.max(0, value - pageSize))}>
          Anterior
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving || pageQuestions.every((item) => answers[item.id])} onClick={confirmPage}>
            {saving ? "Salvando..." : mode === "simulado" ? "Confirmar página" : "Confirmar resposta"}
          </Button>
          <Button className="rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]" disabled={!canGoNext || saving} onClick={() => setIndex((value) => value + pageSize)}>
            {index + pageSize >= questions.length ? "Finalizar" : "Próxima"}
          </Button>
        </div>
      </div>
    </div>
  );
}
