"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, HelpCircle, Layers, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { readApiJson } from "@/lib/client-response";

export function FileActions({
  fileId,
  fileName,
  processed,
  isVideo = false,
  failed = false,
}: {
  fileId: string;
  fileName: string;
  processed: boolean;
  /** Vídeo do YouTube: é lido em segundo plano logo depois de adicionado. */
  isVideo?: boolean;
  failed?: boolean;
}) {
  // Vídeo novo ainda sendo lido pela IA: a tela atualiza sozinha quando terminar.
  const videoReading = isVideo && !processed && !failed;
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function processFile() {
    setLoading("process");
    const response = await fetch(`/api/files/${fileId}/process`, { method: "POST" });
    const data = await readApiJson<{ error?: string }>(
      response,
      "Falha ao processar arquivo.",
    );
    setLoading(null);
    toast[response.ok ? "success" : "error"](response.ok ? (isVideo ? "Vídeo lido e pronto para estudar." : "Arquivo processado.") : data.error ?? "Falha ao processar arquivo.");
    router.refresh();
    return response.ok;
  }

  async function generate(kind: "quiz" | "flashcards" | "simulado") {
    if (!processed) {
      const ok = await processFile();
      if (!ok) return;
    }
    setLoading(kind);
    const subject = fileName.slice(0, 280);
    const endpoint = kind === "flashcards" ? "/api/flashcards/generate" : "/api/quiz/generate";
    const body =
      kind === "quiz"
        ? { fileId, subject, difficulty: "medio", questionCount: 10 }
        : kind === "simulado"
          ? { fileId, subject, difficulty: "simulado", questionCount: 20 }
          : { fileId, title: `Flashcards - ${fileName}`.slice(0, 160), subject, count: 12 };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readApiJson<{ quizId?: string; deckId?: string; error?: string }>(
      response,
      "Não foi possível gerar.",
    );
    setLoading(null);

    if (!response.ok) {
      toast.error(data.error ?? "Não foi possível gerar.");
      return;
    }

    router.push(
      kind === "quiz" ? `/dashboard/quizzes/${data.quizId}` : kind === "simulado" ? `/dashboard/simulados/${data.quizId}` : `/dashboard/flashcards/${data.deckId}`,
    );
    router.refresh();
  }

  async function remove() {
    setLoading("delete");
    const response = await fetch(`/api/files/${fileId}/process`, { method: "DELETE" });
    const data = await readApiJson<{ error?: string }>(
      response,
      "Falha ao excluir arquivo.",
    );
    setLoading(null);
    toast[response.ok ? "success" : "error"](response.ok ? "Arquivo excluido." : data.error ?? "Falha ao excluir arquivo.");
    router.refresh();
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {!processed && !videoReading ? (
        <Button size="sm" variant="outline" disabled={loading !== null} onClick={processFile}>
          {isVideo ? <RotateCcw className="size-4" /> : null}
          {loading === "process" ? (isVideo ? "Lendo o vídeo..." : "Processando...") : isVideo ? "Tentar de novo" : "Processar"}
        </Button>
      ) : null}
      <Button size="sm" variant="outline" disabled={loading !== null || videoReading} onClick={() => generate("quiz")}>
        <HelpCircle className="size-4" />
        {loading === "quiz" ? "Gerando..." : "Quiz"}
      </Button>
      <Button size="sm" variant="outline" disabled={loading !== null || videoReading} onClick={() => generate("flashcards")}>
        <Layers className="size-4" />
        {loading === "flashcards" ? "Gerando..." : "Flashcards"}
      </Button>
      <Button size="sm" variant="outline" disabled={loading !== null || videoReading} onClick={() => generate("simulado")}>
        <ClipboardCheck className="size-4" />
        {loading === "simulado" ? "Gerando..." : "Simulado"}
      </Button>
      <Button size="sm" variant="outline" disabled={loading !== null} onClick={remove}>
        <Trash2 className="size-4" />
        Excluir
      </Button>
    </div>
  );
}
