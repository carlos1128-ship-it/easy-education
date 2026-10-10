"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { RunView } from "@/lib/study-runs";

/** Avisa o painel que um bloco mudou (Iniciar, Continuar, pausar), para ele buscar o estado no servidor. */
export const STUDY_RUN_EVENT = "ee:study-run-changed";

export function notifyStudyRunChanged() {
  window.dispatchEvent(new Event(STUDY_RUN_EVENT));
}

type StudyRunContext = {
  run: RunView | null;
  /** Diferença entre o relógio do servidor e o do navegador, em ms. */
  clockOffset: number;
  refresh: () => Promise<void>;
  setRun: (run: RunView | null) => void;
};

const Context = createContext<StudyRunContext>({ run: null, clockOffset: 0, refresh: async () => undefined, setRun: () => undefined });

const POLL_MS = 30_000;

/** Bloco em andamento no servidor; undefined se não deu para buscar (sem conexão), para manter o último estado. */
async function fetchRun(): Promise<RunView | null | undefined> {
  try {
    const response = await fetch("/api/study-plan/run", { cache: "no-store" });
    if (!response.ok) return undefined;
    return ((await response.json()) as { run: RunView | null }).run;
  } catch {
    return undefined;
  }
}

/**
 * Estado do bloco em andamento, sempre lido do servidor (sobrevive a recarregar a página e a trocar de aparelho).
 * Atualiza ao abrir, ao trocar de página, ao voltar para a aba, quando um bloco muda e a cada 30 s
 * (é assim que os checks do roteiro aparecem sozinhos depois do quiz, dos cartões ou da redação).
 */
export function StudyRunProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [run, setRunState] = useState<RunView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const inFlight = useRef(false);

  const setRun = useCallback((value: RunView | null) => {
    setRunState(value);
    if (value) setClockOffset(new Date(value.serverNow).getTime() - Date.now());
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const result = await fetchRun();
    inFlight.current = false;
    if (result !== undefined) setRun(result);
  }, [setRun]);

  useEffect(() => {
    let active = true;
    fetchRun().then((result) => {
      if (active && result !== undefined) setRun(result);
    });
    return () => {
      active = false;
    };
  }, [pathname, setRun]);

  useEffect(() => {
    const onChange = () => void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    window.addEventListener(STUDY_RUN_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    return () => {
      window.removeEventListener(STUDY_RUN_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const value = useMemo(() => ({ run, clockOffset, refresh, setRun }), [run, clockOffset, refresh, setRun]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useStudyRun() {
  return useContext(Context);
}
