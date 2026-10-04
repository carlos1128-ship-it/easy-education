import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone?: "success" | "warning" | "danger" | "neutral";
};

const toneClasses = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-surface-muted text-ink-muted",
};

export function StatCard({ title, value, change, icon: Icon, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card md:p-6">
      <div className="flex items-center justify-between">
        <div className="grid size-10 place-items-center rounded-lg bg-brand-tint text-brand-strong">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", toneClasses[tone])}>{change}</span>
      </div>
      <p className="mt-5 text-[13px] text-ink-muted">{title}</p>
      <p className="mt-1 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{value}</p>
    </div>
  );
}
