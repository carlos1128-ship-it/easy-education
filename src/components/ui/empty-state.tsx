import type { LucideIcon } from "lucide-react";
import { OwlMascot, type OwlMood } from "@/components/mascot/owl-mascot";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  /** Coruja no lugar do ícone (ver o Guia da Coruja: uma cena por tela). */
  owl?: OwlMood;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  owl,
  title,
  description,
  action,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center">
      {owl ? (
        <OwlMascot mood={owl} size={170} className="mb-3" />
      ) : (
        <div className="mb-4 grid size-12 place-items-center rounded-lg bg-brand-tint text-brand-strong">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      {action ? (
        <Button className="mt-5" onClick={onAction} type="button">
          {action}
        </Button>
      ) : null}
    </div>
  );
}
