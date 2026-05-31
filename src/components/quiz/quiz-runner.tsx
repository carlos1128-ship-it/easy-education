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
};

function normalizeOptions(options: unknown) {
  return Array.isArray(options) ? options.map(String) : [];
}

export function QuizRunner({ quizId, questions }: QuizRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(questions.filter((item) => item.userAnswer).map((item) => [item.id, item.userAnswer as string])),
  );
  const [saving, setSaving] = useState(false);
  const question = questions[index];
  const selected = question ? answers[question.id] : undefined;
  const answeredCount = questions.filter((item) => answers[item.id]).length;
  const finished = questions.length > 0 && answeredCount === questions.length && index >= questions.length;
  const score = questions.filter((item) => answers[item.id] === item.correctAnswer).length;

  async function answerCurrent(answer: string) {
    if (!question) return;
    setAnswers((current) => ({ ...current, [question.id]: answer }));
    setSaving(true);
    const response = await fetch(`/api/quiz/${quizId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answer }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Nao foi possivel salvar a resposta.");
    }
  }

  if (!question && !finished) {
    return (
      <div className="mx-auto max-w-3xl rounded-[20px] border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#0F172A]">Quiz sem questoes</h1>
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
          {score} de {questions.length} questoes corretas.
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

  const options = normalizeOptions(question.options);

  return (
    <div className="mx-auto max-w-3xl rounded-[20px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-[#64748B]">
          Questao {index + 1} de {questions.length}
        </span>
        <Progress value={((index + 1) / questions.length) * 100} className="max-w-40" />
      </div>
      <h1 className="text-xl font-bold text-[#0F172A]">{question.question}</h1>
      <div className="mt-6 grid gap-3">
        {options.map((option) => {
          const letter = option.slice(0, 1);
          return (
            <button
              type="button"
              key={option}
              onClick={() => answerCurrent(letter)}
              className={cn(
                "rounded-xl border border-[#E2E8F0] bg-white p-4 text-left text-[#0F172A] transition-colors hover:border-[#4F46E5]/30",
                selected === letter && "border-[#4F46E5] bg-[#EEF2FF]",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {selected ? (
        <div className="mt-5 rounded-xl bg-[#F8FAFC] p-4 text-sm">
          <p className={selected === question.correctAnswer ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
            {selected === question.correctAnswer ? "Voce acertou." : `Resposta correta: ${question.correctAnswer}`}
          </p>
          <p className="mt-2 text-[#64748B]">{question.explanation}</p>
        </div>
      ) : null}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>
          Anterior
        </Button>
        <Button className="rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]" disabled={!selected || saving} onClick={() => setIndex((value) => value + 1)}>
          {index === questions.length - 1 ? "Finalizar" : "Proxima"}
        </Button>
      </div>
    </div>
  );
}
