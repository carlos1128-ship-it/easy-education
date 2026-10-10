"use client";

import { useCallback, useState } from "react";
import { NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { notifyStudyRunChanged } from "@/components/study-plan/study-run-provider";
import { readApiJson } from "@/lib/client-response";
import { NOTE_MAX_CHARS, type NoteLink } from "@/lib/notes";
import { cn } from "@/lib/utils";

type SavedNote = { id: string; content: string; createdAt: string };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/**
 * "Anotar": abre uma caixa para escrever uma anotação ligada ao lugar onde o aluno está (questão, quiz, bloco do
 * plano, arquivo). Mostra as anotações já feitas ali. Não gasta IA.
 */
export function NoteButton({ link, label = "Anotar", className, compact = false }: { link: NoteLink; label?: string; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const query = new URLSearchParams(Object.entries(link).filter(([, value]) => value) as [string, string][]).toString();

  const load = useCallback(async () => {
    const response = await fetch(`/api/notes?${query}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { notes: SavedNote[] };
    setNotes(data.notes);
  }, [query]);

  function openDialog() {
    setOpen(true);
    void load();
  }

  async function save() {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...link, content: text }) });
      const data = await readApiJson<{ note?: SavedNote }>(response, "Não foi possível salvar a anotação.");
      if (!response.ok || !data.note) throw new Error(data.error ?? "Não foi possível salvar a anotação.");
      setNotes((current) => [data.note!, ...current]);
      setText("");
      toast.success("Anotação salva.");
      // Anotação no bloco marca a etapa "fechar explicando" do roteiro.
      if (link.blockKey) notifyStudyRunChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a anotação.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Apagar esta anotação?")) return;
    const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (response.ok) setNotes((current) => current.filter((note) => note.id !== id));
    else toast.error("Não foi possível apagar a anotação.");
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border-strong font-medium text-ink transition-colors hover:bg-surface-muted",
          compact ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-3 text-sm",
          className,
        )}
      >
        <NotebookPen className={compact ? "size-3.5" : "size-4"} aria-hidden="true" />
        {label}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink">Anotação</DialogTitle>
            <DialogDescription className="text-sm text-ink-muted">
              {[link.subject, link.topic].filter(Boolean).join(" · ") || "Escreva com suas palavras. Só você vê."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={NOTE_MAX_CHARS}
            placeholder="O que você quer lembrar? Explique com suas palavras."
            aria-label="Texto da anotação"
            className="min-h-32"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">
              {text.length}/{NOTE_MAX_CHARS}
            </span>
            <Button onClick={save} disabled={saving || !text.trim()}>
              {saving ? "Salvando..." : "Salvar anotação"}
            </Button>
          </div>
          {notes.length ? (
            <ul className="m-0 flex max-h-60 list-none flex-col gap-2 overflow-y-auto p-0">
              {notes.map((note) => (
                <li key={note.id} className="rounded-xl bg-surface-muted p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                    <span>{dateFormat.format(new Date(note.createdAt))}</span>
                    <button type="button" onClick={() => remove(note.id)} aria-label="Apagar anotação" className="grid size-7 place-items-center rounded-md hover:bg-surface">
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="m-0 whitespace-pre-line text-ink">{note.content}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
