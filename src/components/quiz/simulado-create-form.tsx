"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { SubjectMultiSelect } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readApiJson } from "@/lib/client-response";

export function SimuladoCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState(["Matematica", "Portugues", "Biologia", "Historia"]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedSubjects = subjects.length ? subjects : ["ENEM"];
    const subject = selectedSubjects.join(", ");
    setLoading(true);
    const response = await fetch("/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: `Simulado de ${subject} no estilo ENEM, com questoes contextualizadas e nivel de prova`,
        subject,
        difficulty: "simulado",
        questionCount: Number(formData.get("questionCount") ?? 20),
        model: "ENEM",
      }),
    });
    const data = await readApiJson<{ quizId?: string; error?: string }>(
      response,
      "Não foi possível gerar o simulado.",
    );
    setLoading(false);

    if (!response.ok || !data.quizId) {
      toast.error(data.error ?? "Não foi possível gerar o simulado.");
      return;
    }

    toast.success("Simulado gerado e salvo.");
    router.push(`/dashboard/simulados/${data.quizId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card lg:flex-row lg:items-end">
      <div className="flex-1">
        <label className="text-sm font-medium text-ink">Áreas ou matérias</label>
        <div className="mt-1">
          <SubjectMultiSelect value={subjects} onChange={setSubjects} compact />
        </div>
      </div>
      <div className="w-full lg:w-36">
        <label htmlFor="simulado-count" className="text-sm font-medium text-ink">Questões</label>
        <Input id="simulado-count" name="questionCount" type="number" min={5} max={20} defaultValue={20} className="mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-lg bg-brand text-on-brand hover:bg-brand-strong">
        <ClipboardCheck className="size-4" />
        {loading ? "Gerando..." : "Novo simulado"}
      </Button>
    </form>
  );
}
