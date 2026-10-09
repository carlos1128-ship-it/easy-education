"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 5000;
/** Leitura de vídeo leva até ~4,5 min; depois disso para de atualizar sozinho. */
const MAX_MS = 6 * 60 * 1000;

/**
 * Enquanto houver material sendo lido pela IA, atualiza a lista a cada 5 s. É a garantia caso o aviso em tempo
 * real do Supabase não chegue (conexão caiu, aba em segundo plano): o aluno não precisa apertar F5.
 */
export function PendingRefresh({ pending }: { pending: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!pending) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - startedAt > MAX_MS) {
        window.clearInterval(timer);
        return;
      }
      if (document.visibilityState === "visible") router.refresh();
    }, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pending, router]);

  return null;
}
