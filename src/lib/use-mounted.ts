"use client";

import { useEffect, useRef } from "react";

/** Diz se o componente ainda está na tela. Evita avisos e redirecionamentos de respostas que chegam depois que a pessoa saiu da página. */
export function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
