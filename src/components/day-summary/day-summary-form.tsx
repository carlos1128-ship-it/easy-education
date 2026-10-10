"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Layers, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { SpeakButton } from "@/components/audio/speak-button";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/client-response";
import { SUMMARY_MAX_CHARS, SUMMARY_MIN_CHARS, type DaySummaryFeedback } from "@/lib/day-summary-rules";
import { cn } from "@/lib/utils";

/** Texto corrido da correção, para ouvir. */
function feedbackSpeech(feedback: DaySummaryFeedback) {
  return [
    feedback.overview,
    feedback.correct.length ? `O que está certo: ${feedback.correct.join(". ")}.` : "",
    feedback.wrong.length ? `O que corrigir: ${feedback.wrong.map((item) => item.fix).join(". ")}.` : "",
    feedback.missing.length ? `O que ficou faltando: ${feedback.missing.join(". ")}.` : "",
    feedback.review.length ? `Para revisar amanhã: ${feedback.review.join(". ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function Feedback({ feedback }: { feedback: DaySummaryFeedback }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function makeCards() {
    setBusy(true);
    try {
      const response = await fetch("/api/day-summary/flashcards", { method: "POST" });
      const data = await readApiJson<{ deckId?: string }>(response, "Não foi possível criar os flashcards.");
      if (!response.ok || !data.deckId) throw new Error(data.error ?? "Não foi possível criar os flashcards.");
      router.push(`/dashboard/flashcards/${data.deckId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar os flashcards.");
      setBusy(false);
    }
  }

  const sections = [
    { title: "O que está certo", items: feedback.correct, tone: "text-success" },
    { title: "Ficou faltando ou incompleto", items: feedback.missing, tone: "text-warning" },
    { title: "Revise amanhã", items: feedback.review, tone: "text-brand-strong" },
  ];

  return (
    <section aria-label="Correção do resumo" className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <OwlMascot mood={feedback.wrong.length ? "determinada" : "comemorando"} size={112} />
        <div className="flex flex-1 flex-col gap-3">
          <p className="m-0 text-[17px] font-semibold text-ink">{feedback.overview || "Dia fechado."}</p>
          <SpeakButton text={feedbackSpeech(feedback)} label="Ouvir a correção" className="self-start" />
        </div>
      </div>
      {feedback.wrong.length ? (
        <div>
          <h2 className="m-0 mb-2 text-base font-bold text-danger">O que está errado</h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {feedback.wrong.map((item) => (
              <li key={`${item.excerpt}-${item.fix}`} className="rounded-xl bg-danger-tint p-3 text-sm">
                {item.excerpt ? <p className="m-0 text-ink-muted line-through">“{item.excerpt}”</p> : null}
                <p className="m-0 mt-1 text-ink">{item.fix}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {sections.map((section) =>
        section.items.length ? (
          <div key={section.title}>
            <h2 className={cn("m-0 mb-2 text-base font-bold", section.tone)}>{section.title}</h2>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {feedback.cards.length ? (
        <Button onClick={makeCards} disabled={busy} className="self-start">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Layers className="size-4" aria-hidden="true" />}
          Transformar os erros em {feedback.cards.length} {feedback.cards.length === 1 ? "flashcard" : "flashcards"}
        </Button>
      ) : null}
    </section>
  );
}

/** Formulário "Fechar o dia": contador de caracteres, envio e a correção. */
export function DaySummaryForm({ initialContent, initialFeedback, hasStudied }: { initialContent: string; initialFeedback: DaySummaryFeedback | null; hasStudied: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [busy, setBusy] = useState(false);
  const length = content.trim().length;
  const valid = length >= SUMMARY_MIN_CHARS && length <= SUMMARY_MAX_CHARS;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/day-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await readApiJson<{ summary?: { feedback: DaySummaryFeedback } }>(response, "Não foi possível corrigir o resumo.");
      if (!response.ok || !data.summary) throw new Error(data.error ?? "Não foi possível corrigir o resumo.");
      setFeedback(data.summary.feedback);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível corrigir o resumo.");
    } finally {
      setBusy(false);
    }
  }

  if (feedback) {
    return (
      <div className="flex flex-col gap-5">
        <details className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> Seu resumo de hoje
          </summary>
          <p className="m-0 mt-3 whitespace-pre-line text-ink-muted">{content}</p>
        </details>
        <Feedback feedback={feedback} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={SUMMARY_MAX_CHARS}
        disabled={!hasStudied || busy}
        placeholder="Explique com suas palavras o que você estudou hoje: as ideias principais, um exemplo e o que ainda está confuso."
        aria-label="Resumo do dia"
        aria-describedby="contador-resumo"
        className="min-h-60 text-[15px] leading-6"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span id="contador-resumo" className={cn("text-sm tabular-nums", length && !valid ? "text-warning" : "text-ink-muted")}>
          {length < SUMMARY_MIN_CHARS ? `${length} de ${SUMMARY_MIN_CHARS} caracteres no mínimo` : `${length} de ${SUMMARY_MAX_CHARS} caracteres`}
        </span>
        <Button onClick={submit} disabled={!valid || busy || !hasStudied}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
          {busy ? "Corrigindo…" : "Fechar o dia"}
        </Button>
      </div>
    </div>
  );
}
