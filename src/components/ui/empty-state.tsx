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
    <div className="flex min-h-64 flex-col items-center justify-center rounded-[20px] border border-dashed border-[#CBD5E1] bg-white p-8 text-center shadow-sm">
      <div className="mb-4 rounded-xl bg-[#EEF2FF] p-3 text-[#4F46E5]">
        <Icon className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action ? (
        <Button
          className="mt-5 rounded-xl bg-[#4F46E5] text-white hover:bg-[#4338CA]"
          onClick={onAction}
          type="button"
        >
          {action}
        </Button>
      ) : null}
    </div>
  );
}
