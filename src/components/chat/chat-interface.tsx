"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { quickSuggestions } from "@/lib/app-data";
import { readApiJson } from "@/lib/client-response";
import { cn } from "@/lib/utils";
import type { ChatInputMessage } from "@/types";

type ChatAction = { type: string; href: string; label: string };
type ChatMessage = ChatInputMessage & { action?: ChatAction };

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

export function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Oi! Sou sua IA de estudos. Posso tirar dúvidas e também criar quizzes, simulados, flashcards e o seu plano de estudo direto no app. Como posso ajudar hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function sendMessage(content = input) {
    if (!content.trim() || loading) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content: text }) => ({ role, content: text })) }),
      });
      const data = await readApiJson(response, messageForChatStatus(response.status));
      if (!response.ok) throw new Error(data.error ?? messageForChatStatus(response.status));

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
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <Link href="/dashboard/arquivos" className="inline-flex size-11 flex-shrink-0 items-center justify-center rounded-lg border border-border-strong text-ink hover:bg-surface-muted" aria-label="Enviar arquivo">
            <Paperclip className="size-4" aria-hidden="true" />
          </Link>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Peça um quiz, um plano de estudo ou tire uma dúvida…"
            aria-label="Mensagem para a IA"
            className="min-h-11 resize-none"
          />
          <Button type="submit" size="icon-lg" disabled={loading || !input.trim()} aria-label="Enviar mensagem">
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </div>
    </div>
  );
}
