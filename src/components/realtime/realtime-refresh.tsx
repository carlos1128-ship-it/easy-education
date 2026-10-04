"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/*
 * Só tabelas com user_id, sempre filtradas pelo usuário atual.
 * - `profiles` saiu: o layout lê o perfil a cada render e a tela de
 *   configurações já chama router.refresh() depois de salvar.
 * - `quiz_questions` e `flashcards` saíram: não têm user_id, então a
 *   assinatura recebia mudanças de TODOS os usuários e recarregava a página
 *   de todo mundo. As ações do próprio aluno já atualizam a tela.
 */
const userScopedTables = [
  "study_plans",
  "study_sessions",
  "uploaded_files",
  "quizzes",
  "flashcard_decks",
  "essays",
  "chat_messages",
];

const REFRESH_DEBOUNCE_MS = 1200;

export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`dashboard-refresh:${userId}`);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingWhileHidden = false;

    // Junta rajadas de eventos (ex.: um quiz com 20 questões) num único refresh.
    const scheduleRefresh = () => {
      if (document.visibilityState === "hidden") {
        pendingWhileHidden = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && pendingWhileHidden) {
        pendingWhileHidden = false;
        scheduleRefresh();
      }
    };

    for (const table of userScopedTables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        scheduleRefresh,
      );
    }

    channel.subscribe();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
