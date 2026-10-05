import Image from "next/image";
import { cn } from "@/lib/utils";

/* Logo 4B recortado de docs/redesign/Easy Education Logo v4-selection.png, sem redesenho.
   Os PNGs têm resolução de sobra para @2x/@3x nos tamanhos abaixo. No tema escuro o filtro
   deixa o logo todo branco, igual à versão escura da folha. */
const files = {
  horizontal: { src: "/brand/logo-horizontal.png", width: 632, height: 80 },
  symbol: { src: "/brand/logo-simbolo.png", width: 513, height: 326 },
} as const;

/** Altura do logo em px */
const sizes = { xs: 18, sm: 22, md: 25, lg: 32 } as const;

export function Logo({
  size = "md",
  variant = "horizontal",
  className,
  preload = false,
}: {
  size?: keyof typeof sizes;
  variant?: keyof typeof files;
  className?: string;
  /** Logo acima da dobra: carrega antes */
  preload?: boolean;
}) {
  const file = files[variant];
  const height = variant === "symbol" ? Math.round(sizes[size] * 1.25) : sizes[size];
  const width = Math.round((height * file.width) / file.height);
  return (
    <Image
      src={file.src}
      alt="Easy Education"
      width={width}
      height={height}
      unoptimized
      preload={preload}
      className={cn("block shrink-0 select-none dark:brightness-0 dark:invert", className)}
      style={{ width, height }}
    />
  );
}
