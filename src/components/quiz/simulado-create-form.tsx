"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SimuladoCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    const subject = String(formData.get("subject") ?? "ENEM");
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
    const data = (await response.json()) as { quizId?: string; error?: string };
    setLoading(false);

    if (!response.ok || !data.quizId) {
      toast.error(data.error ?? "Nao foi possivel gerar o simulado.");
      return;
    }

    toast.success("Simulado gerado e salvo.");
    router.push(`/dashboard/quizzes/${data.quizId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="simulado-subject" className="text-sm font-semibold text-[#0F172A]">Area ou materia</label>
        <Input id="simulado-subject" name="subject" required placeholder="Matematica, Natureza, Humanas..." className="mt-1" />
      </div>
      <div className="w-full sm:w-36">
        <label htmlFor="simulado-count" className="text-sm font-semibold text-[#0F172A]">Questoes</label>
        <Input id="simulado-count" name="questionCount" type="number" min={5} max={20} defaultValue={20} className="mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]">
        <ClipboardCheck className="size-4" />
        {loading ? "Gerando..." : "Novo simulado"}
      </Button>
    </form>
  );
}
