"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { SubjectMultiSelect } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/client-response";
import { useMountedRef } from "@/lib/use-mounted";

type FileOption = { id: string; name: string; processed: boolean };

export function SimuladoCreateForm({ files = [] }: { files?: FileOption[] }) {
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
        <Input id="simulado-count" name="questionCount" type="number" min={5} max={20} defaultValue={20} className="mt-1" />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 rounded-lg bg-brand text-on-brand hover:bg-brand-strong">
        <ClipboardCheck className="size-4" />
        {loading ? "Gerando..." : "Novo simulado"}
      </Button>
    </form>
  );
}
