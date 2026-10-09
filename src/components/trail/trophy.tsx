import Image from "next/image";
import { cn } from "@/lib/utils";

/** Troféus da trilha, um por seção, na ordem das seções (arte em public/images/trofeus). */
export const TROPHY_IMAGES = [
  { file: "bronze", name: "Bronze" },
  { file: "prata", name: "Prata" },
  { file: "ouro", name: "Ouro" },
  { file: "platina", name: "Platina" },
  { file: "esmeralda", name: "Esmeralda" },
  { file: "safira", name: "Safira" },
  { file: "rubi", name: "Rubi" },
  { file: "ametista", name: "Ametista" },
  { file: "diamante", name: "Diamante" },
  { file: "lendario", name: "Lendário" },
] as const;

/**
 * Troféu animado: conquistado, ele flutua devagar e um brilho passa por cima (o Lendário também pulsa).
 * Bloqueado, fica cinza e parado. Quem pede menos movimento no sistema vê o troféu parado (ver globals.css).
 */
export function Trophy({ tier, locked = false, size = 120, className }: { tier: number; locked?: boolean; size?: number; className?: string }) {
  const art = TROPHY_IMAGES[Math.min(Math.max(tier, 0), TROPHY_IMAGES.length - 1)];
  const legendary = art.file === "lendario";

  return (
    <span
      className={cn("trophy relative inline-block", !locked && "trophy--earned", !locked && legendary && "trophy--legendary", className)}
      style={{ width: size, height: size, animationDelay: `${(tier % 5) * -0.7}s` }}
      aria-hidden="true"
    >
      {/* A arte tem bastante margem em volta do troféu: amplia um pouco para ele ocupar o espaço. */}
      <span className="absolute inset-0 scale-[1.3]">
      <Image
        src={`/images/trofeus/${art.file}.png`}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className={cn("block size-full select-none object-contain", locked && "opacity-35 grayscale")}
        draggable={false}
      />
      {locked ? null : (
        // O brilho usa o próprio desenho como máscara: só passa por cima do troféu, não do fundo.
        <span
          className="trophy__shine pointer-events-none absolute inset-0"
          style={{ maskImage: `url(/images/trofeus/${art.file}.png)`, WebkitMaskImage: `url(/images/trofeus/${art.file}.png)` }}
        />
      )}
      </span>
    </span>
  );
}
