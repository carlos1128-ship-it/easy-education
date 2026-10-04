import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-lg bg-brand-tint text-brand-strong">
        <Icon className="size-6" aria-hidden="true" />
      </div>
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
