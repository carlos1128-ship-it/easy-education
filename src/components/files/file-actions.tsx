"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function FileActions({ fileId, fileName, processed }: { fileId: string; fileName: string; processed: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function processFile() {
    setLoading("process");
    const response = await fetch(`/api/files/${fileId}/process`, { method: "POST" });
    setLoading(null);
    toast[response.ok ? "success" : "error"](response.ok ? "Arquivo processado." : "Falha ao processar arquivo.");
    router.refresh();
    return response.ok;
  }

  async function generate(kind: "quiz" | "flashcards") {
    if (!processed) {
      const ok = await processFile();
      if (!ok) return;
    }
    setLoading(kind);
    const endpoint = kind === "quiz" ? "/api/quiz/generate" : "/api/flashcards/generate";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "quiz"
        ? { fileId, subject: fileName, difficulty: "medio", questionCount: 10, model: "ENEM" }
        : { fileId, title: `Flashcards - ${fileName}`, subject: fileName, count: 12 }),
    });
    const data = (await response.json()) as { quizId?: string; deckId?: string; error?: string };
    setLoading(null);

    if (!response.ok) {
      toast.error(data.error ?? "Nao foi possivel gerar.");
      return;
    }

    router.push(kind === "quiz" ? `/dashboard/quizzes/${data.quizId}` : `/dashboard/flashcards/${data.deckId}`);
    router.refresh();
  }

  async function remove() {
    setLoading("delete");
    const response = await fetch(`/api/files/${fileId}/process`, { method: "DELETE" });
    setLoading(null);
    toast[response.ok ? "success" : "error"](response.ok ? "Arquivo excluido." : "Falha ao excluir arquivo.");
    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {!processed ? (
        <Button size="sm" variant="outline" disabled={loading !== null} onClick={processFile}>
          {loading === "process" ? "Processando..." : "Processar"}
        </Button>
      ) : null}
      <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => generate("quiz")}>
        <HelpCircle className="size-4" />
        Quiz
      </Button>
      <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => generate("flashcards")}>
        <Layers className="size-4" />
        Flashcards
      </Button>
      <Button size="sm" variant="outline" disabled={loading !== null} onClick={remove}>
        <Trash2 className="size-4" />
        Excluir
      </Button>
    </div>
  );
}
