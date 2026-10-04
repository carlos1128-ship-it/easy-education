"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageValue } from "@/lib/use-local-storage";

/** Estudo em andamento iniciado pelo plano; o cronômetro do canto lê daqui. */
export type ActiveStudy = {
  subject: string;
  topic: string;
  method: string;
  type: string;
  plannedMinutes: number;
  startedAt: number;
  href?: string;
};

const KEY = "ee-active-study";

export function studyBlockId(block: Pick<ActiveStudy, "subject" | "topic" | "method">) {
  return `${block.subject}|${block.topic}|${block.method}`;
}

export function useActiveStudy() {
  const [raw, setRaw] = useLocalStorageValue(KEY);

  const active = useMemo<ActiveStudy | null>(() => {
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as ActiveStudy;
      return Number.isFinite(value.startedAt) && value.subject ? value : null;
    } catch {
      return null;
    }
  }, [raw]);

  const setActive = useCallback((value: ActiveStudy | null) => setRaw(value ? JSON.stringify(value) : null), [setRaw]);

  return { active, setActive };
}
