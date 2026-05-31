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
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

export function StatCard({ title, value, change, icon: Icon, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <div className="rounded-[10px] bg-[#EEF2FF] p-2 text-[#4F46E5]">
          <Icon className="size-5" />
        </div>
        <span className={cn("rounded-full px-2 py-1 text-xs", toneClasses[tone])}>{change}</span>
      </div>
      <p className="mt-5 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}
