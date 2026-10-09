"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Flag, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_KINDS, REPORT_KIND_LABEL, type ReportKind } from "@/lib/bank/constants";
import { readApiJson } from "@/lib/client-response";
import { cn } from "@/lib/utils";

/** Contato de suporte (defina NEXT_PUBLIC_SUPPORT_EMAIL ou NEXT_PUBLIC_SUPPORT_URL). Sem isso, o link não aparece. */
const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL || (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ? `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}` : "");

export function BookmarkButton({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !on;
    try {
      const response = await fetch(`/api/bank/questions/${questionId}/bookmark`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next }) });
      const data = await readApiJson(response, "Não foi possível marcar a questão.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível marcar a questão.");
      setOn(next);
      toast.success(next ? "Questão marcada. Ela entra na sua revisão." : "Marcação removida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível marcar a questão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60",
        on ? "border-brand bg-brand-tint text-brand-strong" : "border-border-strong text-ink hover:bg-surface-muted",
      )}
    >
      {on ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
      {on ? "Marcada para revisar" : "Marcar para revisar"}
    </button>
  );
}

export function ReportButton({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReportKind>("enunciado_errado");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/bank/questions/${questionId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, note: note.trim() || undefined }) });
      const data = await readApiJson(response, "Não foi possível enviar o aviso.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível enviar o aviso.");
      toast.success("Obrigado! A equipe vai analisar esta questão.");
      setOpen(false);
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar o aviso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted">
        <Flag size={16} aria-hidden="true" /> Reportar questão
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink">Reportar um problema</DialogTitle>
            <DialogDescription className="text-sm text-ink-muted">Viu algo errado nesta questão? Conte o que foi e a equipe confere.</DialogDescription>
          </DialogHeader>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="sr-only">Tipo de problema</legend>
            {REPORT_KINDS.map((item) => (
              <label key={item} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm", kind === item ? "border-brand bg-brand-tint" : "border-border")}>
                <input type="radio" name="report-kind" value={item} checked={kind === item} onChange={() => setKind(item)} className="accent-[var(--brand)]" />
                {REPORT_KIND_LABEL[item]}
              </label>
            ))}
          </fieldset>
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Quer explicar melhor? (opcional)" aria-label="Detalhes do problema" className="min-h-20" />
          {SUPPORT_URL ? (
            <a href={SUPPORT_URL} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-strong underline underline-offset-2">
              <LifeBuoy size={14} aria-hidden="true" /> Falar com o suporte
            </a>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={send} disabled={busy}>
              {busy ? "Enviando..." : "Enviar aviso"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Rodapé de uma questão: marcar, reportar e (quando configurado) suporte. */
export function QuestionTools({ questionId, bookmarked }: { questionId: string; bookmarked: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <BookmarkButton questionId={questionId} initial={bookmarked} />
      <ReportButton questionId={questionId} />
    </div>
  );
}
