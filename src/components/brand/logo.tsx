import { cn } from "@/lib/utils";

export const OWL_PATH =
  "M4 2.5 9 6.6c1.9-.6 4.1-.6 6 0L20 2.5V13a8 8 0 0 1-16 0ZM5.6 12.4a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0ZM7.5 12.4a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0ZM12 12.4a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0ZM13.9 12.4a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0ZM11 16.8h2l-1 1.6Z";

const sizes = {
  sm: { box: "size-8 rounded-[8px]", owl: 22, text: "text-base" },
  md: { box: "size-9 rounded-[9px]", owl: 24, text: "text-lg" },
  lg: { box: "size-14 rounded-[14px]", owl: 38, text: "text-[22px]" },
} as const;

export function LogoMark({ size = "md", className }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <span className={cn("grid shrink-0 place-items-center bg-brand", s.box, className)} aria-hidden="true">
      <svg width={s.owl} height={s.owl} viewBox="0 0 24 24">
        <path fill="var(--on-brand)" fillRule="evenodd" d={OWL_PATH} />
      </svg>
    </span>
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  className,
  wordmarkClassName,
}: {
  size?: keyof typeof sizes;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark ? (
        <span className={cn("font-extrabold tracking-[-0.02em] text-wordmark", sizes[size].text, wordmarkClassName)}>
          Easy Education
        </span>
      ) : (
        <span className="sr-only">Easy Education</span>
      )}
    </span>
  );
}
