"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const subscribeNothing = () => () => undefined;

/**
 * "Falar": o aluno dita e o texto entra no campo (reconhecimento de voz do próprio navegador, pt-BR).
 * Custo zero de IA. Funciona no Chrome, no Edge e no Safari; onde não houver suporte, o botão não aparece.
 */
export function DictateButton({ onText, className, label = "Falar" }: { onText: (text: string) => void; className?: string; label?: string }) {
  const supported = useSyncExternalStore(subscribeNothing, () => Boolean(recognitionClass()), () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => () => recognition.current?.stop(), []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Klass = recognitionClass();
    if (!Klass) return;
    const next = new Klass();
    next.lang = "pt-BR";
    next.continuous = true;
    next.interimResults = false;
    next.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) onTextRef.current(result[0].transcript.trim());
      }
    };
    next.onerror = (event) => setError(event.error === "not-allowed" ? "Permita o uso do microfone para ditar." : "Não deu para ouvir. Tente de novo.");
    next.onend = () => setListening(false);
    recognition.current = next;
    setError(null);
    next.start();
    setListening(true);
  }

  const Icon = listening ? MicOff : Mic;
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium",
          listening ? "border-danger bg-danger-tint text-danger" : "border-border-strong text-ink hover:bg-surface-muted",
          className,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
        {listening ? "Parar de ditar" : label}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
