import Link from "next/link";
import { ArrowRight, Library } from "lucide-react";

/** Chamada para o banco de questões (provas anteriores), que funciona em todos os planos. */
export function BankEntryCard({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center">
      <span className="grid size-11 flex-none place-items-center rounded-full bg-brand-tint text-brand-strong">
        <Library size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-[15px] font-bold text-ink">{title}</h2>
        <p className="m-0 mt-1 text-sm text-ink-muted">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand no-underline transition-colors hover:bg-brand-strong"
      >
        {action}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
