"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readApiJson } from "@/lib/client-response";

type ProfileSettingsFormProps = {
  name: string;
  studyGoal: string;
  dailyMinutes: number;
  studyMethod: string;
};

export function ProfileSettingsForm({ name, studyGoal, dailyMinutes, studyMethod }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        studyGoal: String(formData.get("studyGoal") ?? ""),
        dailyMinutes: Number(formData.get("dailyMinutes") ?? 60),
        studyMethod: String(formData.get("studyMethod") ?? ""),
      }),
    });
    const data = await readApiJson<{ error?: string }>(
      response,
      "Nao foi possivel salvar.",
    );
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Nao foi possivel salvar.");
      return;
    }

    toast.success("Preferencias salvas.");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="settings-name" className="text-sm font-bold text-[#0F172A]">Nome</label>
          <Input id="settings-name" name="name" defaultValue={name} />
        </div>
        <div className="space-y-2">
          <label htmlFor="settings-goal" className="text-sm font-bold text-[#0F172A]">Objetivo</label>
          <Input id="settings-goal" name="studyGoal" defaultValue={studyGoal} />
        </div>
        <div className="space-y-2">
          <label htmlFor="settings-minutes" className="text-sm font-bold text-[#0F172A]">Minutos por dia</label>
          <Input id="settings-minutes" name="dailyMinutes" type="number" min={30} max={600} defaultValue={dailyMinutes} />
        </div>
        <div className="space-y-2">
          <label htmlFor="settings-method" className="text-sm font-bold text-[#0F172A]">Metodo preferido</label>
          <Input id="settings-method" name="studyMethod" defaultValue={studyMethod} />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="mt-6 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]">
        {loading ? "Salvando..." : "Salvar alteracoes"}
      </Button>
    </form>
  );
}
