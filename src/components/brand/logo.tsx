import Image from "next/image";
import { cn } from "@/lib/utils";

/* Logo 4B (bico sólido), SVGs oficiais de docs/redesign/Easy Education logo design.zip (svg/v4).
   Versão horizontal: símbolo + "Easy Education" em Lexend 800, -0.02em, nas proporções do design.
   Tema escuro: símbolo branco e texto claro. */
const SYMBOL_RATIO = 143.59 / 92.66; // viewBox do símbolo

/** Altura do símbolo em px */
const sizes = { xs: 16, sm: 19, md: 22, lg: 28 } as const;

export function Logo({
  size = "md",
  variant = "horizontal",
  className,
  preload = false,
}: {
  size?: keyof typeof sizes;
  variant?: "horizontal" | "symbol";
  className?: string;
  /** Logo acima da dobra: carrega antes */
  preload?: boolean;
}) {
  const height = sizes[size];
  const width = Math.round(height * SYMBOL_RATIO);
  const symbol = (src: string, themeClass: string) => (
    <Image
      src={src}
      alt=""
      width={width}
      height={height}
      unoptimized
      preload={preload}
      className={cn("shrink-0 select-none", themeClass)}
      style={{ width, height }}
    />
  );

  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      style={{ gap: Math.round(height * 0.33) }}
      role={variant === "symbol" ? "img" : undefined}
      aria-label={variant === "symbol" ? "Easy Education" : undefined}
    >
      {symbol("/brand/logo-simbolo-azul.svg", "block dark:hidden")}
      {symbol("/brand/logo-simbolo-branco.svg", "hidden dark:block")}
      {variant === "horizontal" ? (
        <span
          className="whitespace-nowrap font-extrabold leading-none tracking-[-0.02em] text-ink"
          style={{ fontSize: Math.round(height * 0.92) }}
        >
          Easy Education
        </span>
      ) : null}
    </span>
  );
}
