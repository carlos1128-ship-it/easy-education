"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readApiJson } from "@/lib/client-response";

type GeneratorProps = {
  goal: string;
  dailyMinutes: number;
  method: string;
  targetDate?: string | null;
};

export function StudyPlanGenerator({ goal, dailyMinutes, method, targetDate }: GeneratorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subjects = String(formData.get("subjects") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name, difficulty: 3 }));

    if (!subjects.length) {
      toast.error("Informe pelo menos uma materia.");
      return;
    }

    setLoading(true);
    const response = await fetch("/api/study-plan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: String(formData.get("goal") ?? goal),
        targetDate: String(formData.get("targetDate") ?? "") || undefined,
        dailyHours: Number(formData.get("dailyHours") ?? 1),
        subjects,
        method,
      }),
    });
    const data = await readApiJson<{ error?: string }>(
      response,
      "Nao foi possivel gerar o plano.",
    );
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Nao foi possivel gerar o plano.");
      return;
    }

    toast.success("Plano gerado e salvo.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="plan-goal">Objetivo</Label>
        <Input id="plan-goal" name="goal" defaultValue={goal} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="plan-date">Data-alvo</Label>
        <Input id="plan-date" name="targetDate" type="date" defaultValue={targetDate ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="plan-hours">Horas/dia</Label>
        <Input id="plan-hours" name="dailyHours" type="number" min={1} max={8} defaultValue={Math.max(1, Math.round(dailyMinutes / 60))} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="plan-subjects">Materias</Label>
        <Input id="plan-subjects" name="subjects" placeholder="Matematica, Biologia" />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA] md:col-span-4">
        <Sparkles className="size-4" />
        {loading ? "Gerando..." : "Gerar novo plano"}
      </Button>
    </form>
  );
}
