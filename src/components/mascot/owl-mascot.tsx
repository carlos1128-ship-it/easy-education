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

/** Largura e altura da coruja dentro de uma caixa quadrada de `size` px (mantém a proporção da pose). */
export function owlBox(mood: OwlMood, size: number) {
  const owl = OWLS[mood];
  return owl.w >= owl.h ? { width: size, height: Math.round((size * owl.h) / owl.w) } : { width: Math.round((size * owl.w) / owl.h), height: size };
}

type OwlMascotProps = {
  mood: OwlMood;
  /** Lado maior da coruja, em px (a outra medida segue a proporção da pose). */
  size?: number;
  message?: string;
  className?: string;
  /** Carregar já (acima da dobra). */
  priority?: boolean;
};

/**
 * Coruja animada, com fundo transparente. Um contorno suave (classe owl-glow) evita que a coruja branca
 * suma no fundo claro e dá um halo azul no escuro. Com "reduzir movimento", fica parada.
 */
export function OwlMascot({ mood, size = 96, message, className, priority }: OwlMascotProps) {
  const owl = OWLS[mood];
  const box = owlBox(mood, size);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div key={`owl-${mood}`} className="grid flex-none animate-owl-pop place-items-center" style={box}>
        <Image
          src={owlSrc(mood)}
          alt=""
          width={owl.w}
          height={owl.h}
          unoptimized
          loading={priority ? "eager" : "lazy"}
          draggable={false}
          className="owl-anim owl-glow h-full w-full select-none object-contain"
          style={owlAnimationStyle(mood)}
        />
      </div>
      {message ? (
        <p
          key={`msg-${message}`}
          className="relative max-w-[260px] animate-owl-pop rounded-2xl border border-border bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink shadow-card before:absolute before:-left-[7px] before:top-1/2 before:size-3 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-l before:border-border before:bg-surface"
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
      <OwlMascot mood="patinete" size={120} message={message} priority />
    </div>
  );
}

/**
 * Tela de carregamento: a coruja de patinete atravessa a faixa, ida e volta, levantando poeira.
 * Com "reduzir movimento", fica parada no meio.
 */
export function OwlLoader({ label = "Carregando…", className }: { label?: string; className?: string }) {
  const box = owlBox("patinete", 132);
  return (
    <div role="status" aria-live="polite" className={cn("relative flex w-full flex-col items-center gap-4 overflow-hidden py-10", className)}>
      <div className="relative h-[150px] w-full [container-type:inline-size]">
        <div className="owl-anim absolute bottom-3 left-1/2 -ml-[66px]" style={{ animation: "owl-ride 7s ease-in-out infinite" }}>
          <span className="owl-anim absolute bottom-2 left-1 size-3 rounded-full bg-brand-soft" style={{ animation: "owl-dust 0.7s ease-out infinite" }} aria-hidden="true" />
          <span className="owl-anim absolute bottom-4 left-4 size-2 rounded-full bg-brand-soft" style={{ animation: "owl-dust 0.7s 0.35s ease-out infinite" }} aria-hidden="true" />
          <Image
            src={owlSrc("patinete")}
            alt=""
            width={OWLS.patinete.w}
            height={OWLS.patinete.h}
            unoptimized
            priority
            draggable={false}
            className="owl-anim owl-glow select-none object-contain"
            style={{ ...box, ...owlAnimationStyle("patinete") }}
          />
        </div>
        <div className="absolute inset-x-[8%] bottom-2 h-1.5 rounded-full bg-track" aria-hidden="true" />
      </div>
      <p className="m-0 text-sm font-semibold text-ink-muted">{label}</p>
    </div>
  );
}
