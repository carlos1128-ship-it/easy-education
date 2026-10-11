"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SubjectMultiSelect } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { OwlGenerating } from "@/components/mascot/owl-mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/client-response";
import { useMountedRef } from "@/lib/use-mounted";

type FileOption = {
  id: string;
  name: string;
  processed: boolean;
};

export function QuizCreateForm({ files = [] }: { files?: FileOption[] }) {
  const mounted = useMountedRef();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("medio");
  const [fileId, setFileId] = useState("none");
  const [subjects, setSubjects] = useState(["Matematica"]);
  // Padrão: questões prontas (provas anteriores, sem IA). A IA entra se o aluno escolher ou se a matéria não tiver banco.
  const [source, setSource] = useState<"ia" | "provas">("provas");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedSubjects = subjects.length ? subjects : ["Conhecimentos gerais"];
    setLoading(true);
    let response: Response;
    try {
      response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: String(formData.get("topic") ?? "").trim() || undefined,
          fileId: fileId !== "none" ? fileId : undefined,
          subject: selectedSubjects.join(", "),
          difficulty,
          questionCount: Number(formData.get("questionCount") ?? 10),
          source: fileId === "none" ? source : "ia",
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
      "Não foi possível gerar o quiz.",
    );
    if (!mounted.current) return;
    setLoading(false);

    if (!response.ok || !data.quizId) {
      toast.error(data.error ?? "Não foi possível gerar o quiz.");
      return;
    }

    toast.success("Quiz gerado e salvo.");
    router.push(`/dashboard/quizzes/${data.quizId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-5 text-brand-strong" />
        <h2 className="font-bold text-ink">Montar um quiz</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Matérias</Label>
          <SubjectMultiSelect value={subjects} onChange={setSubjects} compact />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quiz-topic">Tema</Label>
          <Input id="quiz-topic" name="topic" placeholder="Funcoes, citologia, revolucoes..." />
        </div>
        <div className="space-y-1.5">
          <Label>Questões</Label>
          <Select value={source} onValueChange={(value) => value && setSource(value as "ia" | "provas")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="provas">Prontas, de provas anteriores</SelectItem>
              <SelectItem value="ia">Criadas pela IA no seu estilo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Arquivo processado</Label>
          <Select value={fileId} onValueChange={(value) => value && setFileId(value)} disabled={source === "provas"}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem arquivo</SelectItem>
              {files.filter((file) => file.processed).map((file) => (
                <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Dificuldade</Label>
            <Select value={difficulty} onValueChange={(value) => value && setDifficulty(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facil">Fácil</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="dificil">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="question-count">Quantidade</Label>
            <Input id="question-count" name="questionCount" type="number" min={5} max={20} defaultValue={10} />
          </div>
        </div>
      </div>
      <Button type="submit" disabled={loading} className="mt-4 gap-2 rounded-lg bg-brand text-on-brand hover:bg-brand-strong">
        <Sparkles className="size-4" />
        {loading ? "Gerando..." : "Criar quiz"}
      </Button>
      {loading ? <OwlGenerating className="mt-4" message="Montando e conferindo as questões. Pode levar até um minuto." /> : null}
    </form>
  );
}
