"use client";

import { useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type OwlMood = "atenta" | "sonolenta" | "piscando" | "feliz" | "comemorando" | "determinada" | "apaixonada" | "cantando";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

function owlSrc(mood: OwlMood, still: boolean) {
  return `/mascote/coruja-${mood}${still ? "-parada" : ""}.webp`;
}

/** Baixa as animações que vão aparecer em seguida, para a troca não piscar. */
export function usePreloadOwls(moods: OwlMood[]) {
  const key = moods.join(",");
  useEffect(() => {
    const ids = key.split(",").map((mood, index) =>
      window.setTimeout(() => {
        const image = new window.Image();
        image.src = owlSrc(mood as OwlMood, false);
      }, 400 + index * 300),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [key]);
}

type OwlMascotProps = {
  mood: OwlMood;
  size?: number;
  message?: string;
  className?: string;
};

/** Mascote animado. Com "reduzir movimento" ativo no sistema, mostra a pose parada. */
export function OwlMascot({ mood, size = 96, message, className }: OwlMascotProps) {
  const still = useReducedMotion();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div key={`owl-${mood}`} className="flex-none animate-owl-pop" style={{ width: size, height: size }}>
        <Image src={owlSrc(mood, still)} alt="" width={size} height={size} unoptimized loading="eager" draggable={false} className="size-full select-none" />
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
