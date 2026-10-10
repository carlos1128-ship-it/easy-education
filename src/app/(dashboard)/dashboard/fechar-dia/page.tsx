import type { Metadata } from "next";
import Link from "next/link";
import { Moon } from "lucide-react";
import { DaySummaryForm } from "@/components/day-summary/day-summary-form";
import { LockedNotice } from "@/components/plan/usage-hint";
import { collectStudiedToday, describeStudied, hasStudied, normalizeFeedback } from "@/lib/day-summary";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";
import { dayKeySP } from "@/lib/study-completion";

export const metadata: Metadata = { title: "Fechar o dia · Easy Education" };

/**
 * Fechar o dia: o aluno escreve o que estudou e a IA corrige pelo que ele fez hoje. É opcional; não mexe na
 * ofensiva. A correção fica guardada com o dia.
 */
export default async function FecharDiaPage() {
  const { user, access } = await getStudentOrRedirect();
  const [summary, studied] = await Promise.all([
    getPrisma().daySummary.findUnique({ where: { userId_day: { userId: user.id, day: dayKeySP() } } }),
    collectStudiedToday(user.id),
  ]);
  const studiedToday = hasStudied(studied);
  const locked = allowanceFor(access.tier, "day_summary").kind === "locked";
  const feedback = summary?.feedback ? normalizeFeedback(summary.feedback) : null;

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
      <header>
        <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
          <Moon className="size-4" aria-hidden="true" /> Opcional · não mexe na sua ofensiva
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Fechar o dia</h1>
        <p className="m-0 mt-1 text-[15px] leading-6 text-ink-muted">
          Explicar com as próprias palavras é um dos jeitos que mais fixam o conteúdo. Escreva o que você estudou hoje (de 200 a 5.000 caracteres) e a IA aponta o que está certo, o que corrigir e o que revisar amanhã.
        </p>
      </header>

      {studiedToday ? (
        <details className="rounded-2xl bg-surface-muted p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-ink">O que você fez hoje (a IA corrige com base nisto)</summary>
          <p className="m-0 mt-3 whitespace-pre-line text-ink-muted">{describeStudied(studied)}</p>
        </details>
      ) : (
        <p className="m-0 rounded-2xl border border-dashed border-border-strong p-5 text-sm text-ink-muted">
          Ainda não há estudo registrado hoje. Faça um bloco do{" "}
          <Link href="/dashboard/plano" className="font-semibold text-brand-strong">
            plano
          </Link>{" "}
          ou um quiz e volte para fechar o dia.
        </p>
      )}

      {locked && !feedback ? (
        <LockedNotice feature="day_summary" title="O resumo corrigido faz parte dos planos" description="Escolha um plano para a IA corrigir o seu resumo do dia." />
      ) : (
        <DaySummaryForm initialContent={summary?.content ?? ""} initialFeedback={feedback} hasStudied={studiedToday} />
      )}
    </div>
  );
}
