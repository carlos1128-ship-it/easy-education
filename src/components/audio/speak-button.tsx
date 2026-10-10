"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const subscribeNothing = () => () => undefined;

/**
 * "Ouvir": lê o texto em voz alta com a voz do próprio aparelho (Web Speech API). Custo zero de IA.
 * A qualidade da voz em português varia por aparelho; o texto continua na tela (é a transcrição).
 * Sem suporte no navegador, o botão não aparece.
 */
export function SpeakButton({ text, label = "Ouvir", className }: { text: string; label?: string; className?: string }) {
  // Só existe no navegador: no servidor o botão não aparece.
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const next = new SpeechSynthesisUtterance(text);
    next.lang = "pt-BR";
    const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith("pt-br")) ?? synth.getVoices().find((item) => item.lang.toLowerCase().startsWith("pt"));
    if (voice) next.voice = voice;
    next.rate = 1;
    next.onend = () => setSpeaking(false);
    next.onerror = () => setSpeaking(false);
    utterance.current = next;
    synth.speak(next);
    setSpeaking(true);
  }

  const Icon = speaking ? Square : Volume2;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-medium text-ink hover:bg-surface-muted", className)}
    >
      <Icon className="size-4" aria-hidden="true" />
      {speaking ? "Parar" : label}
    </button>
  );
}
