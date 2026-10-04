"use client";

import { useState } from "react";
import Link from "next/link";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { quickSuggestions } from "@/lib/app-data";
import { readApiJson } from "@/lib/client-response";
import type { ChatInputMessage } from "@/types";

const chatErrorMessage = "Não foi possível conversar com a IA agora. Tente novamente em instantes.";

function messageForChatStatus(status: number) {
  if (status === 429) return "Muitas mensagens em pouco tempo. Tente novamente em instantes.";
  if (status === 401 || status === 403) return "Entre novamente para continuar usando o chat.";
  return chatErrorMessage;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatInputMessage[]>([
    { role: "assistant", content: "Oi! Sou sua IA de estudos. Como posso ajudar hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(content = input) {
    if (!content.trim()) return;
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok) {
        const data = await readApiJson(response, messageForChatStatus(response.status));
        throw new Error(data.error ?? messageForChatStatus(response.status));
      }
      if (!response.body) throw new Error(chatErrorMessage);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages([...nextMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistant += decoder.decode(value);
        setMessages([...nextMessages, { role: "assistant", content: assistant }]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : chatErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-brand text-on-brand" : "bg-surface-muted text-ink"}`}>
              {message.content}
            </div>
          </div>
        ))}
        {loading ? <p className="text-sm text-ink-muted">IA digitando...</p> : null}
      </div>
      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickSuggestions.map((item) => (
            <button key={item} type="button" onClick={() => sendMessage(item)} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-card transition-colors hover:border-border-strong hover:text-brand-strong">
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/arquivos" className="inline-flex size-8 items-center justify-center rounded-lg border border-input text-ink hover:bg-surface-muted" aria-label="Enviar arquivo">
            <Paperclip className="size-4" />
          </Link>
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pergunte sobre uma matéria, peça resumo ou gere questões..." className="min-h-12 resize-none" />
          <Button size="icon" className="bg-brand text-on-brand hover:bg-brand-strong" onClick={() => sendMessage()} aria-label="Enviar mensagem"><Send className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}
