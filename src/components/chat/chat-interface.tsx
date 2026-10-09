"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, ImagePlus, Loader2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { usePlanOptional } from "@/components/plan/plan-provider";
import { UsageHint } from "@/components/plan/usage-hint";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { quickSuggestions } from "@/lib/app-data";
import { readApiJson } from "@/lib/client-response";
import { cn } from "@/lib/utils";
import type { ChatInputMessage } from "@/types";

type ChatAction = { type: string; href: string; label: string };
type ChatMessage = ChatInputMessage & { action?: ChatAction; imageUrl?: string };
type Attachment = { fileId: string | null; name: string; previewUrl: string; status: "reading" | "ready" | "error" };

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const chatErrorMessage = "Não foi possível conversar com a IA agora. Tente novamente em instantes.";

function messageForChatStatus(status: number) {
  if (status === 429) return "Muitas mensagens em pouco tempo. Tente novamente em instantes.";
  if (status === 401 || status === 403) return "Entre novamente para continuar usando o chat.";
  return chatErrorMessage;
}

/** Negrito com **texto** vira <strong>; nenhum asterisco aparece na tela. */
function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={index} className="font-medium">{part.slice(2, -2)}</strong> : <Fragment key={index}>{part.replace(/\*/g, "")}</Fragment>,
  );
}

/** Mostra parágrafos e listas ("- item" ou "1. item") sem depender de markdown. */
function FormattedMessage({ content }: { content: string }) {
  const blocks: Array<{ kind: "p" | "ul" | "ol"; lines: string[] }> = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ kind: "p", lines: [] });
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const kind = bullet ? "ul" : numbered ? "ol" : "p";
    const text = bullet?.[1] ?? numbered?.[1] ?? line;
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind && (kind !== "p" || last.lines.length)) last.lines.push(text);
    else blocks.push({ kind, lines: [text] });
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks
        .filter((block) => block.lines.length)
        .map((block, index) => {
          if (block.kind === "ul") {
            return (
              <ul key={index} className="m-0 flex list-disc flex-col gap-1 pl-5">
                {block.lines.map((line, i) => <li key={i}>{renderInline(line)}</li>)}
              </ul>
            );
          }
          if (block.kind === "ol") {
            return (
              <ol key={index} className="m-0 flex list-decimal flex-col gap-1 pl-5">
                {block.lines.map((line, i) => <li key={i}>{renderInline(line)}</li>)}
              </ol>
            );
          }
          return (
            <p key={index} className="m-0">
              {block.lines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 ? <br /> : null}
                  {renderInline(line)}
                </Fragment>
              ))}
            </p>
          );
        })}
    </div>
  );
}

const iconButton =
  "inline-flex size-11 items-center justify-center rounded-lg border border-border-strong text-ink hover:bg-surface-muted disabled:opacity-60";

export function ChatInterface() {
  const router = useRouter();
  const plan = usePlanOptional();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Oi! Sou sua IA de estudos. Posso tirar dúvidas, ler a foto de um exercício e criar quizzes, simulados, flashcards e o seu plano de estudo direto no app. Como posso ajudar hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const reading = attachment?.status === "reading";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  /** Envia a foto como material: a IA lê texto, fórmulas e gráficos, e o conteúdo entra na conversa. */
  async function attachImage(file?: File) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error("Envie a imagem em PNG, JPG ou WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem acima de 10MB.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setAttachment({ fileId: null, name: file.name || "Foto", previewUrl, status: "reading" });
    try {
      const formData = new FormData();
      formData.append("file", file, file.name || `foto-${Date.now()}.jpg`);
      const upload = await fetch("/api/files/upload", { method: "POST", body: formData });
      const uploaded = await readApiJson<{ file?: { id: string }; error?: string }>(upload, "Não foi possível enviar a imagem.");
      const fileId = uploaded.file?.id;
      if (!upload.ok || !fileId) throw new Error(uploaded.error ?? "Não foi possível enviar a imagem.");
      const processed = await fetch(`/api/files/${fileId}/process`, { method: "POST" });
      const result = await readApiJson<{ error?: string }>(processed, "Não foi possível ler a imagem.");
      if (!processed.ok) throw new Error(result.error ?? "Não foi possível ler a imagem.");
      setAttachment((current) => (current?.previewUrl === previewUrl ? { ...current, fileId, status: "ready" } : current));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a imagem.");
      setAttachment((current) => (current?.previewUrl === previewUrl ? { ...current, status: "error" } : current));
    }
  }

  async function sendMessage(typed = input) {
    if (loading || reading) return;
    const withImage = attachment?.status === "ready" ? attachment : null;
    // Só a foto, sem texto: pede ajuda com o conteúdo dela.
    const content = typed.trim() || (withImage ? "Me ajude a entender o conteúdo desta imagem." : "");
    if (!content) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content, imageUrl: withImage?.previewUrl }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })),
          // A imagem continua valendo nas próximas perguntas até o aluno remover.
          fileId: withImage?.fileId ?? undefined,
        }),
      });
      const data = await readApiJson(response, messageForChatStatus(response.status));
      if (!response.ok) throw new Error(data.error ?? messageForChatStatus(response.status));

      // Atualiza o "restam X mensagens" sem esperar a página recarregar.
      const usage = data.usage as { remaining?: number | null; resetAt?: string | null } | undefined;
      if (usage && typeof usage.remaining === "number") plan?.setRemaining("chat_message", usage.remaining, usage.resetAt);

      const reply = typeof data.content === "string" ? data.content : "";
      const action = data.action as ChatAction | undefined;
      setMessages([...nextMessages, { role: "assistant", content: reply || chatErrorMessage, action }]);

      if (action?.href) {
        toast.success(action.label);
        window.setTimeout(() => router.push(action.href), 1200);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : chatErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  function pickedFile(event: React.ChangeEvent<HTMLInputElement>) {
    attachImage(event.target.files?.[0]);
    event.target.value = "";
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-5" aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-6",
                message.role === "user" ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm bg-surface-muted text-ink",
              )}
            >
              {message.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) da foto enviada
                <img src={message.imageUrl} alt="Imagem enviada" className="mb-2 max-h-48 rounded-lg object-contain" />
              ) : null}
              {message.role === "assistant" ? <FormattedMessage content={message.content} /> : message.content}
              {message.action ? (
                <Link
                  href={message.action.href}
                  className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-on-brand no-underline hover:bg-brand-strong"
                >
                  {message.action.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        ))}
        {loading ? <p className="text-sm text-ink-muted">A IA está pensando…</p> : null}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-4">
        <UsageHint feature="chat_message" className="mb-3" />
        <div className="mb-3 flex flex-wrap gap-2">
          {quickSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(item)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-brand-strong disabled:opacity-60"
            >
              {item}
            </button>
          ))}
        </div>
        {attachment ? (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-surface-muted p-2 pr-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
            <img src={attachment.previewUrl} alt="" className="size-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="m-0 truncate font-medium text-ink">{attachment.name}</p>
              <p className="m-0 flex items-center gap-1.5 text-ink-muted">
                {attachment.status === "reading" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> A IA está lendo a imagem…
                  </>
                ) : attachment.status === "ready" ? (
                  "Pronta. Pergunte o que quiser sobre ela."
                ) : (
                  "Não foi possível ler. Tente outra foto."
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Remover imagem"
              className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <input ref={galleryRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pickedFile} />
        {/* No celular, capture abre a câmera traseira direto. */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickedFile} />
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <div className="flex flex-shrink-0 gap-1.5">
            <button type="button" onClick={() => cameraRef.current?.click()} disabled={loading || reading} className={cn(iconButton, "md:hidden")} aria-label="Tirar foto">
              <Camera className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={loading || reading}
              className={iconButton}
              aria-label="Enviar imagem"
              title="Enviar imagem (foto do caderno, exercício, gráfico)"
            >
              <ImagePlus className="size-4" aria-hidden="true" />
            </button>
            <Link href="/dashboard/arquivos" className={cn(iconButton, "hidden md:inline-flex")} aria-label="Enviar PDF ou vídeo" title="PDF e vídeos do YouTube">
              <Paperclip className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder={attachment?.status === "ready" ? "Pergunte sobre a imagem…" : "Peça um quiz, um plano de estudo ou tire uma dúvida…"}
            aria-label="Mensagem para a IA"
            className="min-h-11 resize-none"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={loading || reading || (!input.trim() && attachment?.status !== "ready")}
            aria-label="Enviar mensagem"
          >
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
}
