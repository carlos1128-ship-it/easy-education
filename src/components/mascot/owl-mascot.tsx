"use client";

import { useEffect } from "react";
import Image from "next/image";
import { OWLS, owlAnimationStyle, owlSrc, type OwlMood } from "@/lib/owls";
import { cn } from "@/lib/utils";

export type { OwlMood };

/** Baixa as poses que vão aparecer em seguida, para a troca não piscar. */
export function usePreloadOwls(moods: OwlMood[]) {
  const key = moods.join(",");
  useEffect(() => {
    const ids = key.split(",").map((mood, index) =>
      window.setTimeout(() => {
        const image = new window.Image();
        image.src = owlSrc(mood as OwlMood);
      }, 400 + index * 300),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [key]);
}

type OwlMascotProps = {
  mood: OwlMood;
  /** Largura em px (a altura segue a proporção da imagem). */
  size?: number;
  message?: string;
  className?: string;
  /** Carregar já (acima da dobra). */
  priority?: boolean;
};

/**
 * Coruja animada. As imagens têm fundo branco: no tema claro ele some no fundo (multiply);
 * no escuro, a coruja fica num cartão branco arredondado. Com "reduzir movimento", fica parada.
 */
export function OwlMascot({ mood, size = 96, message, className, priority }: OwlMascotProps) {
  const owl = OWLS[mood];
  const height = Math.round((size * owl.h) / owl.w);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        key={`owl-${mood}`}
        className="grid flex-none animate-owl-pop place-items-center overflow-hidden mix-blend-multiply dark:rounded-2xl dark:bg-white dark:mix-blend-normal"
        style={{ width: size, height }}
      >
        <Image
          src={owlSrc(mood)}
          alt=""
          width={owl.w}
          height={owl.h}
          unoptimized
          loading={priority ? "eager" : "lazy"}
          draggable={false}
          className="owl-anim h-[92%] w-[92%] select-none object-contain"
          style={owlAnimationStyle(mood)}
        />
      </div>
      {message ? (
        <p
          key={`msg-${message}`}
          className="relative max-w-[240px] animate-owl-pop rounded-2xl border border-border bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink shadow-card before:absolute before:-left-[7px] before:top-1/2 before:size-3 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-l before:border-border before:bg-surface"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** Coruja de patinete enquanto a IA gera (quiz, simulado, flashcards, plano). */
export function OwlGenerating({ message = "Gerando com a IA. Pode levar até um minuto.", className }: { message?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <OwlMascot mood="patinete" size={88} message={message} priority />
    </div>
  );
}
