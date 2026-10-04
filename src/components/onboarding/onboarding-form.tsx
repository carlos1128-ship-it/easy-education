"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, Clock, Layers, Target } from "lucide-react";
import { SubjectChecklist } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/auth/legacy-ui/button";
import { Input } from "@/components/auth/legacy-ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/auth/legacy-ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { DEFAULT_SELECTED_SUBJECTS } from "@/lib/subjects";

const levels = [
  { value: "Iniciante", hint: "Estou começando a matéria" },
  { value: "Intermediário", hint: "Já vi boa parte do conteúdo" },
  { value: "Avançado", hint: "Quero treinar no nível da prova" },
];
const methods = ["Pomodoro", "Revisão espaçada", "Active Recall", "Blocos de estudo"];

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("Provas escolares");
  const [targetDate, setTargetDate] = useState("");
  const [level, setLevel] = useState("Iniciante");
  const [dailyMinutes, setDailyMinutes] = useState(120);
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, number>>(DEFAULT_SELECTED_SUBJECTS);
  const [method, setMethod] = useState("Pomodoro");
  const [saving, setSaving] = useState(false);
  const progress = ((step + 1) / 4) * 100;
  const StepIcon = [Target, Clock, Layers, CalendarCheck][step];

  const subjectPayload = useMemo(
    () => Object.entries(selectedSubjects).map(([name, difficulty]) => ({ name, difficulty })),
    [selectedSubjects],
  );

  async function finish() {
    setSaving(true);
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal,
        targetDate,
        level,
        dailyMinutes,
        studyMethod: method,
        subjects: subjectPayload,
      }),
    });

    if (!response.ok) {
      setSaving(false);
      toast.error("Não foi possível criar seu plano. Tente de novo.");
      return;
    }

    toast.success("Seu plano de estudos está pronto.");
    router.push("/dashboard");
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#1A2744] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[#EFF4FF] dark:bg-[#131D35] p-2 text-[#1B4FD8] dark:text-[#93C5FD]">
          <StepIcon className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Etapa {step + 1} de 4</p>
          <Progress value={progress} className="mt-2 h-2" />
        </div>
      </div>

      {step === 0 ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>O que você está estudando?</Label>
            <Select value={goal} onValueChange={(value) => value && setGoal(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Provas escolares", "ENEM", "Vestibular", "Faculdade", "Concurso público", "SAT/Processo internacional"].map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data da próxima prova (opcional)</Label>
            <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <Label>Como você se considera?</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {levels.map((item) => (
                <button
                  className={cn("rounded-lg border p-4 text-left", level === item.value && "border-[#1B4FD8] bg-[#EFF4FF] dark:bg-[#131D35]")}
                  key={item.value}
                  onClick={() => setLevel(item.value)}
                  type="button"
                >
                  <p className="font-medium">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">{item.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Label>{formatHours(dailyMinutes)} por dia para estudar</Label>
            <Slider min={60} max={480} step={30} value={[dailyMinutes]} onValueChange={(nextValue) => {
                const value = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                setDailyMinutes(value);
              }} />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <SubjectChecklist value={selectedSubjects} onChange={setSelectedSubjects} />
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <Label>Como você prefere estudar?</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {methods.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMethod(item)}
                className={cn("rounded-lg border p-4 text-left", method === item && "border-[#1B4FD8] bg-[#EFF4FF] dark:bg-[#131D35]")}
              >
                <Check className={cn("mb-3 size-4 text-slate-300 dark:text-[#5B6B8C]", method === item && "text-[#1B4FD8] dark:text-[#93C5FD]")} />
                <p className="font-medium">{item}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex justify-between">
        <Button disabled={step === 0 || saving} variant="outline" onClick={() => setStep((value) => value - 1)}>
          Voltar
        </Button>
        <Button className="bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]" disabled={saving} onClick={step === 3 ? finish : () => setStep((value) => value + 1)}>
          {step === 3 ? (saving ? "Montando seu plano…" : "Criar meu plano") : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
