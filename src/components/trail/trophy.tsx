import { useId } from "react";
import { cn } from "@/lib/utils";

/* Troféus da trilha: um por seção, cada um com material e detalhes próprios.
   As cores são do desenho (metal e pedras), não de texto. */
const TIERS = [
  { light: "#F3C08B", mid: "#C7783A", dark: "#8A4B1F", gem: null },
  { light: "#F4F7FB", mid: "#B8C2CF", dark: "#76818F", gem: null },
  { light: "#FFE58A", mid: "#F5B400", dark: "#B37A00", gem: null },
  { light: "#FFE58A", mid: "#F5B400", dark: "#B37A00", gem: ["#7CF0B2", "#10B26C"] },
  { light: "#F4F7FB", mid: "#B8C2CF", dark: "#76818F", gem: ["#9CC3FF", "#2563EB"] },
  { light: "#FFE58A", mid: "#F5B400", dark: "#B37A00", gem: ["#FF9BA5", "#DC2638"] },
  { light: "#E9D9FF", mid: "#A779F2", dark: "#6B3FC2", gem: ["#F3E8FF", "#9333EA"] },
  { light: "#E6FBFF", mid: "#8FE3F5", dark: "#2BA6C4", gem: ["#FFFFFF", "#67D8F0"] },
  { light: "#FFF1B3", mid: "#FFC51F", dark: "#C27D00", gem: ["#FFB3F0", "#7C3AED"] },
] as const;

export function Trophy({ tier, locked = false, size = 120, className }: { tier: number; locked?: boolean; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = TIERS[Math.min(Math.max(tier, 0), TIERS.length - 1)];
  const stars = tier >= 6;
  const laurel = tier === 8;
  const handles = tier >= 2;

  return (
    <svg
      viewBox="0 0 120 140"
      width={size}
      height={(size * 140) / 120}
      className={cn(locked && "opacity-35 grayscale", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`cup-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={t.dark} />
          <stop offset="0.35" stopColor={t.light} />
          <stop offset="0.6" stopColor={t.mid} />
          <stop offset="1" stopColor={t.dark} />
        </linearGradient>
        <linearGradient id={`base-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={t.mid} />
          <stop offset="1" stopColor={t.dark} />
        </linearGradient>
        {t.gem ? (
          <radialGradient id={`gem-${id}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor={t.gem[0]} />
            <stop offset="1" stopColor={t.gem[1]} />
          </radialGradient>
        ) : null}
      </defs>

      {laurel ? (
        <g fill="#16A34A">
          {[
            [34, 126, -70],
            [25, 117, -50],
            [19, 105, -30],
            [16, 92, -15],
            [16, 79, 0],
          ].map(([x, y, r]) => (
            <g key={y}>
              <ellipse cx={x} cy={y} rx="4.5" ry="8" transform={`rotate(${r} ${x} ${y})`} />
              <ellipse cx={120 - x} cy={y} rx="4.5" ry="8" transform={`rotate(${-r} ${120 - x} ${y})`} />
            </g>
          ))}
        </g>
      ) : null}

      {handles ? (
        <g fill="none" stroke={`url(#base-${id})`} strokeWidth="7" strokeLinecap="round">
          <path d="M30 32 C10 32 10 64 34 66" />
          <path d="M90 32 C110 32 110 64 86 66" />
        </g>
      ) : (
        <g fill="none" stroke={`url(#base-${id})`} strokeWidth="6" strokeLinecap="round">
          <path d="M32 36 C18 38 20 58 36 60" />
          <path d="M88 36 C102 38 100 58 84 60" />
        </g>
      )}

      {/* Taça */}
      <path d="M28 20 H92 V40 C92 62 78 78 60 80 C42 78 28 62 28 40 Z" fill={`url(#cup-${id})`} />
      <path d="M28 20 H92 V26 H28 Z" fill={t.dark} opacity="0.35" />
      <path d="M40 30 C40 52 46 66 56 72" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" fill="none" />

      {/* Emblema */}
      {t.gem ? (
        <g>
          <path d="M60 36 L72 46 L60 62 L48 46 Z" fill={`url(#gem-${id})`} stroke={t.dark} strokeWidth="1.5" />
          <path d="M48 46 H72 M60 36 L56 46 L60 62 L64 46 Z" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1" />
        </g>
      ) : (
        <path
          d="M60 35 L64 44 L74 45 L66.5 51.5 L69 61 L60 56 L51 61 L53.5 51.5 L46 45 L56 44 Z"
          fill={t.light}
          stroke={t.dark}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      )}

      {/* Haste e base */}
      <path d="M53 80 H67 L65 96 H55 Z" fill={`url(#base-${id})`} />
      <rect x="40" y="96" width="40" height="10" rx="3" fill={`url(#cup-${id})`} />
      <rect x="32" y="106" width="56" height="18" rx="4" fill={`url(#base-${id})`} />
      <rect x="44" y="111" width="32" height="8" rx="2" fill={t.light} opacity="0.7" />

      {stars ? (
        <g fill={t.gem ? t.gem[0] : t.light}>
          <path d="M14 18 L16 23 L21 24 L16 26 L14 31 L12 26 L7 24 L12 23 Z" />
          <path d="M106 10 L108 15 L113 16 L108 18 L106 23 L104 18 L99 16 L104 15 Z" />
          <path d="M104 92 L105.5 95.5 L109 96.5 L105.5 98 L104 101.5 L102.5 98 L99 96.5 L102.5 95.5 Z" />
        </g>
      ) : null}
    </svg>
  );
}
