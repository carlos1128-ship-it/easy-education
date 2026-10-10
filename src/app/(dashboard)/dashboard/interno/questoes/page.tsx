import type { Metadata } from "next";
import { AdminActions } from "@/components/bank/admin-actions";
import { requireAdminPage } from "@/lib/admin";
import { describeAccuracy } from "@/lib/ai-quality";
import { EVAL_OWNER, REPORT_KIND_LABEL, REVIEW_STATUS_LABEL, type ReportKind, type ReviewStatus } from "@/lib/bank/constants";
import type { BankOption } from "@/lib/bank/import";
import { sourceLabel } from "@/lib/bank/labels";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Questões · interno" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function InternoQuestoesPage() {
  await requireAdminPage();
  const prisma = getPrisma();
  const include = { exam: { select: { name: true, styleLabel: true } }, subject: { select: { name: true } } } as const;
  const [reports, divergent, sample, counts, evalPending, evalVerdicts] = await Promise.all([
    prisma.questionReport.findMany({ where: { status: "aberto" }, orderBy: { createdAt: "desc" }, take: 50, include: { question: { include } } }),
    prisma.bankQuestion.findMany({ where: { explanationStatus: "divergente" }, include, orderBy: [{ year: "desc" }, { number: "asc" }], take: 40 }),
    prisma.bankQuestion.findMany({ where: { origin: "prova_oficial", isPublished: true, reviewStatus: "nao_revisada" }, include, orderBy: [{ year: "desc" }, { number: "asc" }], take: 30 }),
    prisma.bankQuestion.groupBy({ by: ["reviewStatus", "isPublished"], where: { origin: "prova_oficial" }, _count: { _all: true } }),
    prisma.bankQuestion.findMany({ where: { ownerUserId: EVAL_OWNER, reviewStatus: "nao_revisada" }, include, orderBy: [{ importBatch: "desc" }, { number: "asc" }], take: 20 }),
    prisma.bankQuestion.groupBy({ by: ["importBatch", "reviewStatus"], where: { ownerUserId: EVAL_OWNER }, _count: { _all: true } }),
  ]);
  const batches = new Map<string, { correct: number; wrong: number; pending: number }>();
  for (const row of evalVerdicts) {
    const entry = batches.get(row.importBatch ?? "") ?? { correct: 0, wrong: 0, pending: 0 };
    if (row.reviewStatus === "avaliada_correta") entry.correct += row._count._all;
    else if (row.reviewStatus === "avaliada_incorreta") entry.wrong += row._count._all;
    else entry.pending += row._count._all;
    batches.set(row.importBatch ?? "", entry);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      <header>
        <p className="m-0 text-sm font-medium text-brand-strong">Interno</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Questões: reports e revisão</h1>
        <p className="m-0 mt-2 text-sm text-ink-muted">
          {counts.map((item) => `${item._count._all} ${item.isPublished ? "publicadas" : "não publicadas"} (${REVIEW_STATUS_LABEL[item.reviewStatus as ReviewStatus] ?? item.reviewStatus})`).join(" · ") || "Nenhuma questão importada ainda."}
        </p>
        <a href="/api/internal/bank/export" className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border-strong px-4 text-sm font-medium text-ink no-underline hover:bg-surface-muted">
          Baixar amostra para o professor (CSV)
        </a>
      </header>

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-bold text-ink">Reports abertos ({reports.length})</h2>
        {reports.length === 0 ? <p className="m-0 text-sm text-ink-muted">Nenhum report aberto.</p> : null}
        {reports.map((report) => (
          <article key={report.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong className="text-ink">{REPORT_KIND_LABEL[report.kind as ReportKind] ?? report.kind}</strong>
              <span className="text-ink-muted">· {sourceLabel(report.question)} · {dateFormat.format(report.createdAt)}</span>
              <code className="ml-auto text-xs text-ink-muted">{report.questionId}</code>
            </div>
            {report.note ? <p className="m-0 text-sm text-ink">{report.note}</p> : null}
            <AdminActions
              actions={[
                { label: "Resolvido", body: { type: "report", id: report.id, status: "resolvido" }, tone: "primary" },
                { label: "Descartar", body: { type: "report", id: report.id, status: "descartado" } },
                { label: "Tirar a questão do ar", body: { type: "question", id: report.questionId, isPublished: false }, tone: "danger" },
              ]}
            />
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-bold text-ink">Resolução da IA divergiu do gabarito ({divergent.length})</h2>
        <p className="m-0 text-sm text-ink-muted">Estas questões NÃO estão publicadas. Um professor confere: se o gabarito oficial estiver certo e a resolução precisar de ajuste, corrija antes de publicar.</p>
        {divergent.map((question) => (
          <article key={question.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="m-0 text-sm font-semibold text-ink">
              {sourceLabel(question)} · {question.subject?.name ?? "Sem matéria"} · gabarito oficial: {question.correctLabel}
            </p>
            <p className="m-0 line-clamp-3 text-sm text-ink-muted">{question.statement || question.supportText}</p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-brand-strong">Resolução da IA</summary>
              <p className="m-0 mt-2 whitespace-pre-line text-ink">{question.explanation}</p>
            </details>
            <AdminActions actions={[{ label: "Conferi: publicar", body: { type: "question", id: question.id, isPublished: true }, tone: "primary" }]} />
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-bold text-ink">Avaliação de confiabilidade: questões geradas pela IA</h2>
        <p className="m-0 text-sm text-ink-muted">
          Questões geradas por scripts/eval/generate-sample.ts. Não aparecem para alunos. Marque <strong>Correta</strong> só se o gabarito estiver certo, houver uma única alternativa defensável e a explicação não tiver erro factual. O relatório sai com scripts/eval/report.ts.
        </p>
        {[...batches].map(([batch, entry]) => (
          <p key={batch} className="m-0 text-sm text-ink">
            <strong>{batch}</strong>: {entry.correct + entry.wrong} revisadas
            {entry.correct + entry.wrong ? ` · ${describeAccuracy(entry.correct, entry.correct + entry.wrong)} corretas` : ""} · {entry.pending} pendentes
          </p>
        ))}
        {evalPending.length === 0 ? <p className="m-0 text-sm text-ink-muted">Nenhuma questão de avaliação pendente.</p> : null}
        {evalPending.map((question) => (
          <article key={question.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="m-0 text-sm font-semibold text-ink">
              {question.importBatch} · {question.subject?.name ?? "Sem matéria"} · gabarito da IA: {question.correctLabel}
            </p>
            <p className="m-0 whitespace-pre-line text-sm text-ink">{question.statement}</p>
            <ul className="m-0 list-none p-0 text-sm text-ink">
              {(question.options as BankOption[]).map((option) => (
                <li key={option.label} className={option.label === question.correctLabel ? "font-semibold text-success" : ""}>
                  {option.label}) {option.text}
                </li>
              ))}
            </ul>
            <p className="m-0 text-sm text-ink-muted">
              <strong className="text-ink">Explicação: </strong>
              {question.explanation}
            </p>
            <AdminActions
              actions={[
                { label: "Correta", body: { type: "question", id: question.id, reviewStatus: "avaliada_correta" }, tone: "primary" },
                { label: "Incorreta", body: { type: "question", id: question.id, reviewStatus: "avaliada_incorreta" }, tone: "danger" },
              ]}
            />
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-lg font-bold text-ink">Amostra para revisão de professor</h2>
        {sample.map((question) => (
          <article key={question.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="m-0 text-sm font-semibold text-ink">
              {sourceLabel(question)} · {question.subject?.name ?? "Sem matéria"} · gabarito: {question.correctLabel}
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-brand-strong">Enunciado e resolução</summary>
              <p className="m-0 mt-2 text-ink-muted">{question.statement}</p>
              <p className="m-0 mt-2 whitespace-pre-line text-ink">{question.explanation}</p>
            </details>
            <AdminActions
              actions={[
                { label: "Amostra revisada", body: { type: "question", id: question.id, reviewStatus: "amostra_revisada" } },
                { label: "Revisada", body: { type: "question", id: question.id, reviewStatus: "revisada" }, tone: "primary" },
              ]}
            />
          </article>
        ))}
      </section>
    </div>
  );
}
