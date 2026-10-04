"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
      <span className="grid size-12 place-items-center rounded-lg bg-danger-tint text-danger">
        <AlertCircle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="m-0 text-xl font-bold text-ink">Não conseguimos carregar esta página.</h1>
      <p className="m-0 text-sm text-ink-muted">Tente de novo. Se continuar, volte ao início e abra a página outra vez.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => unstable_retry()}>
          Tentar de novo
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-lg border border-border-strong px-5 text-[15px] font-medium text-ink no-underline hover:bg-surface-muted"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
