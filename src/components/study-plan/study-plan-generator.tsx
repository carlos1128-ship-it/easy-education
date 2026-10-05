"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SubjectChecklist } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readApiJson } from "@/lib/client-response";
import { useMountedRef } from "@/lib/use-mounted";
import { DEFAULT_SELECTED_SUBJECTS } from "@/lib/subjects";

type GeneratorProps = {
  goal: string;
  dailyMinutes: number;
  method: string;
  targetDate?: string | null;
};

export function StudyPlanGenerator({ goal, dailyMinutes, method, targetDate }: GeneratorProps) {
  const mounted = useMountedRef();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, number>>(DEFAULT_SELECTED_SUBJECTS);
  const subjects = useMemo(
    () => Object.entries(selectedSubjects).map(([name, difficulty]) => ({ name, difficulty })),
    [selectedSubjects],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!subjects.length) {
      toast.error("Selecione pelo menos uma matéria.");
      return;
    }

    setLoading(true);
    let response: Response;
    try {
      response = await fetch("/api/study-plan/generate", {
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
    } catch {
      if (mounted.current) {
        setLoading(false);
        toast.error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      }
      return;
    }
    const data = await readApiJson<{ error?: string }>(
      response,
      "Não foi possível gerar o plano.",
    );
    if (!mounted.current) return;
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Não foi possível gerar o plano.");
      return;
    }

    toast.success("Plano gerado e salvo.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card md:grid-cols-4 lg:p-5">
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
      <div className="space-y-1.5 md:col-span-4">
        <Label>Matérias</Label>
        <SubjectChecklist value={selectedSubjects} onChange={setSelectedSubjects} />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-lg bg-brand text-on-brand hover:bg-brand-strong md:col-span-4">
        <Sparkles className="size-4" />
        {loading ? "Gerando..." : "Gerar novo plano"}
      </Button>
    </form>
  );
}
