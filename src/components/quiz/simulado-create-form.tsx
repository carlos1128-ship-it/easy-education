"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { SubjectMultiSelect } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/client-response";
import { useMountedRef } from "@/lib/use-mounted";

type FileOption = { id: string; name: string; processed: boolean };

/** Tamanhos de simulado oferecidos; só aparecem os que cabem no plano. */
const SIZES = [10, 20, 45, 90];

export function SimuladoCreateForm({ files = [], maxQuestions = 20 }: { files?: FileOption[]; maxQuestions?: number }) {
  const sizes = SIZES.filter((size) => size <= maxQuestions);
  const mounted = useMountedRef();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState(["Matematica", "Portugues", "Biologia", "Historia"]);
  const [fileId, setFileId] = useState("none");
  const readyFiles = files.filter((file) => file.processed);
  const material = readyFiles.find((file) => file.id === fileId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedSubjects = subjects.length ? subjects : ["Conhecimentos gerais"];
    // Com material escolhido, o simulado sai do conteúdo dele (PDF, foto ou vídeo).
    const subject = material ? material.name.slice(0, 280) : selectedSubjects.join(", ");
    setLoading(true);
    let response: Response;
    try {
      response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: material ? undefined : `Simulado de ${subject}, com questoes contextualizadas e nivel de prova`,
          fileId: material?.id,
          subject,
          difficulty: "simulado",
          questionCount: Number(formData.get("questionCount") ?? 20),
        }),
      });
    } catch {
      if (mounted.current) {
        setLoading(false);
        toast.error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      }
      return;
    }
    const data = await readApiJson<{ quizId?: string; error?: string }>(
      response,
      "Não foi possível gerar o simulado.",
    );
    if (!mounted.current) return;
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
      {readyFiles.length ? (
        <div className="w-full lg:w-64">
          <label className="text-sm font-medium text-ink">Material</label>
          <div className="mt-1">
            <Select value={fileId} onValueChange={(value) => value && setFileId(value)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem material (por matéria)</SelectItem>
                {readyFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
      {material ? null : (
        <div className="flex-1">
          <label className="text-sm font-medium text-ink">Áreas ou matérias</label>
          <div className="mt-1">
            <SubjectMultiSelect value={subjects} onChange={setSubjects} compact />
          </div>
        </div>
      )}
      <div className="w-full lg:w-36">
        <label htmlFor="simulado-count" className="text-sm font-medium text-ink">Questões</label>
        <select
          id="simulado-count"
          name="questionCount"
          defaultValue={String(sizes.includes(20) ? 20 : sizes[sizes.length - 1] ?? 10)}
          className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink"
        >
          {(sizes.length ? sizes : [10]).map((size) => (
            <option key={size} value={size}>{size} questões</option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-lg bg-brand text-on-brand hover:bg-brand-strong">
        <ClipboardCheck className="size-4" />
        {loading ? "Gerando..." : "Novo simulado"}
      </Button>
    </form>
  );
}
