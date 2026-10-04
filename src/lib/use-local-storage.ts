"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "ee-local-storage";

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Valor do localStorage sincronizado entre componentes e abas; null no servidor. */
export function useLocalStorageValue(key: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const handler = (event: Event) => {
      if (event instanceof StorageEvent ? event.key === key : (event as CustomEvent<string>).detail === key) onChange();
    };
    window.addEventListener("storage", handler);
    window.addEventListener(EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(EVENT, handler);
    };
  }, [key]);

  const value = useSyncExternalStore(subscribe, () => read(key), () => null);

  const setValue = useCallback(
    (next: string | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        // Sem armazenamento local (aba anônima, bloqueio): o valor não persiste.
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );

  return [value, setValue] as const;
}
