"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const userScopedTables = [
  "profiles",
  "study_plans",
  "study_sessions",
  "uploaded_files",
  "quizzes",
  "flashcard_decks",
  "essays",
  "chat_messages",
];

export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`dashboard-refresh:${userId}`);

    for (const table of userScopedTables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      );
    }

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_questions" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "flashcards" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
