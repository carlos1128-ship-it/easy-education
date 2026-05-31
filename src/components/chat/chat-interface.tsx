"use client";

import { useState } from "react";
import Link from "next/link";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { quickSuggestions } from "@/lib/app-data";
import type { ChatInputMessage } from "@/types";

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

      if (!response.body) throw new Error("Resposta indisponivel.");
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
      toast.error(error instanceof Error ? error.message : "Erro ao conversar com a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col rounded-[20px] border border-[#E2E8F0] bg-white shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
            <div className={`inline-block max-w-[85%] rounded-xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-[#4F46E5] text-white" : "bg-[#F1F5F9] text-[#0F172A]"}`}>
              {message.content}
            </div>
          </div>
        ))}
        {loading ? <p className="text-sm text-slate-500">IA digitando...</p> : null}
      </div>
      <div className="border-t border-[#E2E8F0] p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {quickSuggestions.map((item) => (
            <button key={item} type="button" onClick={() => sendMessage(item)} className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#64748B] shadow-sm transition-colors hover:border-[#4F46E5]/30 hover:text-[#4F46E5]">
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/arquivos" className="inline-flex size-8 items-center justify-center rounded-lg border border-input text-[#0F172A] hover:bg-[#F8FAFC]" aria-label="Enviar arquivo">
            <Paperclip className="size-4" />
          </Link>
          <Textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pergunte sobre uma materia, peça resumo ou gere questoes..." className="min-h-12 resize-none" />
          <Button size="icon" className="bg-[#4F46E5] text-white hover:bg-[#4338CA]" onClick={() => sendMessage()} aria-label="Enviar mensagem"><Send className="size-4" /></Button>
        </div>
      </div>
    </div>
  );
}
