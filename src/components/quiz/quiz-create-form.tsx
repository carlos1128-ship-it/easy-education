"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { SubjectMultiSelect } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/client-response";

type FileOption = {
  id: string;
  name: string;
  processed: boolean;
};

export function QuizCreateForm({ files = [] }: { files?: FileOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState("medio");
  const [fileId, setFileId] = useState("none");
  const [subjects, setSubjects] = useState(["Matematica"]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedSubjects = subjects.length ? subjects : ["ENEM"];
    setLoading(true);
    const response = await fetch("/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: String(formData.get("topic") ?? "").trim() || undefined,
        fileId: fileId !== "none" ? fileId : undefined,
        subject: selectedSubjects.join(", "),
        difficulty,
        questionCount: Number(formData.get("questionCount") ?? 10),
        model: "ENEM",
      }),
    });
    const data = await readApiJson<{ quizId?: string; error?: string }>(
      response,
      "Não foi possível gerar o quiz.",
    );
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
    <form onSubmit={submit} className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-5 text-[#4F46E5]" />
        <h2 className="font-bold text-[#0F172A]">Gerar quiz com IA</h2>
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
          <Label>Arquivo processado</Label>
          <Select value={fileId} onValueChange={(value) => value && setFileId(value)}>
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
                <SelectItem value="facil">Facil</SelectItem>
                <SelectItem value="medio">Medio</SelectItem>
                <SelectItem value="dificil">Dificil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="question-count">Questões</Label>
            <Input id="question-count" name="questionCount" type="number" min={5} max={20} defaultValue={10} />
          </div>
        </div>
      </div>
      <Button type="submit" disabled={loading} className="mt-4 gap-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]">
        <Sparkles className="size-4" />
        {loading ? "Gerando..." : "Criar quiz"}
      </Button>
    </form>
  );
}
