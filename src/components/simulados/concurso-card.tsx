"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/client-response";
import { EXAM_BOARDS } from "@/lib/learner-profile";

type Props = {
  role: string | null;
  board: string | null;
  /** Simulado do dia já gerado hoje (abre o mesmo, sem gastar o limite). */
  todayQuizId: string | null;
};

/** Simulado personalizado do concurso do aluno: um por dia, gerado por IA no estilo da banca. */
export function ConcursoCard({ role, board, todayQuizId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!role);
  const [roleInput, setRoleInput] = useState(role ?? "");
  const [boardInput, setBoardInput] = useState(board ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/simulados/concurso", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleInput, board: boardInput || undefined }),
      });
      const data = await readApiJson(response, "Não foi possível salvar.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      setEditing(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    try {
      const response = await fetch("/api/simulados/concurso", { method: "POST" });
      const data = await readApiJson<{ quizId?: string }>(response, "Não foi possível gerar o simulado.");
      if (!response.ok || !data.quizId) throw new Error(data.error ?? "Não foi possível gerar o simulado.");
      router.push(`/dashboard/simulados/${data.quizId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o simulado.");
      setGenerating(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1.5">
          <label htmlFor="concurso-role" className="text-sm font-medium text-ink">Qual concurso você vai fazer?</label>
          <Input id="concurso-role" value={roleInput} onChange={(event) => setRoleInput(event.target.value)} placeholder="Ex.: Polícia Militar SP, INSS técnico, Banco do Brasil" required minLength={2} maxLength={80} />
        </div>
        <div className="w-full space-y-1.5 lg:w-56">
          <span className="text-sm font-medium text-ink">Banca (se souber)</span>
          <Select value={boardInput} onValueChange={(value) => setBoardInput(value ?? "")}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Escolha a banca" /></SelectTrigger>
            <SelectContent>
              {EXAM_BOARDS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={saving || roleInput.trim().length < 2}>{saving ? "Salvando..." : "Salvar"}</Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex-1">
        <p className="m-0 text-[17px] font-bold text-ink">
          {role}
          {board ? <span className="font-normal text-ink-muted"> · banca {board}</span> : null}
        </p>
        <p className="m-0 mt-1 text-sm text-ink-muted">
          30 questões no estilo da banca, com as matérias que costumam cair no edital. Um novo a cada dia.{" "}
          <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand-strong underline underline-offset-2">
            Trocar concurso
          </button>
        </p>
      </div>
      {todayQuizId ? (
        <Link href={`/dashboard/simulados/${todayQuizId}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline hover:bg-brand-strong">
          Abrir o simulado de hoje
        </Link>
      ) : (
        <Button onClick={generate} disabled={generating} className="min-h-11">
          <Sparkles className="size-4" aria-hidden="true" />
          {generating ? "Montando seu simulado..." : "Gerar o simulado de hoje"}
        </Button>
      )}
    </div>
  );
}
