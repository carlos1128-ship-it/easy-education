import type { ComponentProps, ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuizOptionState = "default" | "selected" | "correct" | "wrong";

const stateClasses: Record<QuizOptionState, string> = {
  default: "border-border-strong bg-surface text-ink hover:bg-surface-muted",
  selected: "border-brand bg-brand-tint text-brand-strong",
  correct: "border-success bg-success-tint text-success",
  wrong: "border-danger bg-danger-tint text-danger",
};

type QuizOptionProps = Omit<ComponentProps<"button">, "children"> & {
  letter: string;
  state?: QuizOptionState;
  children: ReactNode;
};

/** Alternativa de quiz/simulado. Acerto e erro nunca dependem só da cor: ícone + legenda. */
export function QuizOption({ letter, state = "default", className, children, type = "button", ...props }: QuizOptionProps) {
  return (
    <button
      type={type}
      aria-pressed={state === "selected" ? true : undefined}
      className={cn(
        "flex min-h-12 w-full items-center gap-3 rounded-lg border-[1.5px] px-4 py-3 text-left text-[15px] leading-6 transition-colors disabled:cursor-default",
        stateClasses[state],
        className,
      )}
      {...props}
    >
      <span className="grid size-7 flex-none place-items-center rounded-full border-[1.5px] border-current text-[13px] font-medium leading-4">
        {letter}
      </span>
      <span className="flex-1 text-ink">{children}</span>
      {state === "correct" ? (
        <span className="inline-flex items-center gap-1 text-[13px] font-medium leading-4">
          <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
          Correta
        </span>
      ) : null}
      {state === "wrong" ? (
        <span className="inline-flex items-center gap-1 text-[13px] font-medium leading-4">
          <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
          Errada
        </span>
      ) : null}
    </button>
  );
}
