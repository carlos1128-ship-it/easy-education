"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FileOption = {
  id: string;
  name: string;
  processed: boolean;
};

export function FlashcardCreateForm({ files = [] }: { files?: FileOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fileId, setFileId] = useState("none");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/flashcards/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        topic: String(formData.get("topic") ?? "").trim() || undefined,
        fileId: fileId !== "none" ? fileId : undefined,
        count: Number(formData.get("count") ?? 12),
      }),
    });
    const data = (await response.json()) as { deckId?: string; error?: string };
    setLoading(false);

    if (!response.ok || !data.deckId) {
      toast.error(data.error ?? "Nao foi possivel criar o deck.");
      return;
    }

    toast.success("Deck criado e salvo.");
    router.push(`/dashboard/flashcards/${data.deckId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="size-5 text-[#4F46E5]" />
        <h2 className="font-bold text-[#0F172A]">Gerar flashcards com IA</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deck-title">Titulo</Label>
          <Input id="deck-title" name="title" required placeholder="Revisao de Biologia" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deck-subject">Materia</Label>
          <Input id="deck-subject" name="subject" required placeholder="Biologia" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deck-topic">Tema</Label>
          <Input id="deck-topic" name="topic" placeholder="Mitose, ribossomos..." />
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
        <div className="space-y-1.5">
          <Label htmlFor="card-count">Quantidade</Label>
          <Input id="card-count" name="count" type="number" min={5} max={30} defaultValue={12} />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="mt-4 gap-2 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]">
        <Sparkles className="size-4" />
        {loading ? "Gerando..." : "Criar deck"}
      </Button>
    </form>
  );
}
