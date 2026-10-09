"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIFFICULTIES, DIFFICULTY_LABEL } from "@/lib/bank/constants";
import { readApiJson } from "@/lib/client-response";

const selectClass = "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px] text-ink";

/** Pede uma questão nova à IA no estilo do exame. Ela sai com o selo "Gerada por IA" e com gabarito verificado. */
export function GenerateQuestionForm({ exams, subjects, defaultExam }: { exams: Array<{ slug: string; name: string }>; subjects: Array<{ slug: string; name: string }>; defaultExam: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch("/api/bank/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam: String(form.get("exam") ?? defaultExam),
          subject: String(form.get("subject") ?? ""),
          topic: String(form.get("topic") ?? "").trim() || undefined,
          difficulty: String(form.get("difficulty") ?? "medio"),
        }),
      });
      const data = await readApiJson<{ questionId?: string }>(response, "Não foi possível gerar a questão.");
      if (!response.ok || !data.questionId) throw new Error(data.error ?? "Não foi possível gerar a questão.");
      toast.success("Questão criada. Ela leva o selo \"Gerada por IA\".");
      router.push(`/dashboard/banco/questao/${data.questionId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar a questão.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-surface p-5 shadow-card md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gen-exam" className="text-[13px] font-medium text-ink-muted">
          Estilo da prova
        </label>
        <select id="gen-exam" name="exam" defaultValue={defaultExam} className={selectClass}>
          {exams.map((exam) => (
            <option key={exam.slug} value={exam.slug}>
              No estilo do {exam.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gen-subject" className="text-[13px] font-medium text-ink-muted">
          Matéria
        </label>
        <select id="gen-subject" name="subject" required defaultValue="matematica" className={selectClass}>
          {subjects.map((subject) => (
            <option key={subject.slug} value={subject.slug}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gen-topic" className="text-[13px] font-medium text-ink-muted">
          Assunto (opcional)
        </label>
        <Input id="gen-topic" name="topic" maxLength={120} placeholder="Ex.: probabilidade, fotossíntese, Era Vargas" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="gen-difficulty" className="text-[13px] font-medium text-ink-muted">
          Dificuldade
        </label>
        <select id="gen-difficulty" name="difficulty" defaultValue="medio" className={selectClass}>
          {DIFFICULTIES.map((item) => (
            <option key={item} value={item}>
              {DIFFICULTY_LABEL[item]}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={busy} className="gap-2">
          <Sparkles className="size-4" aria-hidden="true" />
          {busy ? "Criando e conferindo a questão..." : "Gerar questão"}
        </Button>
        <p className="m-0 mt-2 text-[13px] text-ink-muted">A IA cria a questão e depois resolve sem ver o gabarito para conferir. Leva cerca de 20 segundos. Questões geradas por IA nunca são questões de prova.</p>
      </div>
    </form>
  );
}
