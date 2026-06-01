"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { SubjectSelect } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readApiJson } from "@/lib/client-response";

export function SimuladoCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("ENEM");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: `Simulado de ${subject} no estilo ENEM, com questões contextualizadas e nível de prova`,
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
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="text-sm font-semibold text-[#0F172A]">Área ou matéria</label>
        <div className="mt-1">
          <SubjectSelect value={subject} onChange={setSubject} placeholder="Selecione a matéria" />
        </div>
      </div>
      <div className="w-full sm:w-36">
        <label htmlFor="simulado-count" className="text-sm font-semibold text-[#0F172A]">Questões</label>
        <Input id="simulado-count" name="questionCount" type="number" min={5} max={20} defaultValue={20} className="mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]">
        <ClipboardCheck className="size-4" />
        {loading ? "Gerando..." : "Novo simulado"}
      </Button>
    </form>
  );
}
