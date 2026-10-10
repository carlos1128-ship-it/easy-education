"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { readApiJson } from "@/lib/client-response";
import { NOTE_MAX_CHARS } from "@/lib/notes";

/** Editar e apagar uma anotação na tela "Minhas anotações". */
export function NoteItemActions({ id, content }: { id: string; content: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(content);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const response = await fetch(`/api/notes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) });
      const data = await readApiJson(response, "Não foi possível salvar.");
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Apagar esta anotação?")) return;
    const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!response.ok) toast.error("Não foi possível apagar.");
    router.refresh();
  }

  return (
    <span className="ml-auto flex gap-1">
      <button type="button" onClick={() => setOpen(true)} aria-label="Editar anotação" className="grid size-7 place-items-center rounded-md hover:bg-surface-muted">
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
      <button type="button" onClick={remove} aria-label="Apagar anotação" className="grid size-7 place-items-center rounded-md hover:bg-surface-muted">
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-ink">Editar anotação</DialogTitle>
          </DialogHeader>
          <Textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={NOTE_MAX_CHARS} aria-label="Texto da anotação" className="min-h-40" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy || !text.trim()}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </span>
  );
}
