import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { NoteButton } from "@/components/notes/note-button";
import { NoteItemActions } from "@/components/notes/note-item-actions";
import { noteContextLabel } from "@/lib/notes";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Minhas anotações · Easy Education" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

/** Onde a anotação foi feita, para voltar lá com um clique. */
function contextHref(note: { quizId: string | null; fileId: string | null; blockKey: string | null }) {
  if (note.quizId) return `/dashboard/quizzes/${note.quizId}`;
  if (note.fileId) return "/dashboard/arquivos";
  if (note.blockKey) return "/dashboard/plano";
  return null;
}

export default async function AnotacoesPage({ searchParams }: { searchParams: Promise<{ materia?: string }> }) {
  const { user } = await getStudentOrRedirect();
  const { materia } = await searchParams;
  const prisma = getPrisma();
  const [notes, subjects] = await Promise.all([
    prisma.note.findMany({ where: { userId: user.id, ...(materia ? { subject: materia } : {}) }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.note.groupBy({ by: ["subject"], where: { userId: user.id, subject: { not: null } }, _count: { _all: true }, orderBy: { subject: "asc" } }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 flex items-center gap-2 text-sm font-medium text-brand-strong">
            <NotebookPen className="size-4" aria-hidden="true" /> Só você vê
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Minhas anotações</h1>
          <p className="m-0 mt-1 text-sm text-ink-muted">Escreva com suas palavras. Você também pode anotar dentro das questões e dos blocos do plano.</p>
        </div>
        <NoteButton label="Nova anotação" link={materia ? { subject: materia } : {}} />
      </header>

      {subjects.length ? (
        <nav aria-label="Filtrar por matéria" className="flex flex-wrap gap-2">
          <Link href="/dashboard/anotacoes" className={cn("rounded-full border px-3 py-1 text-sm no-underline", !materia ? "border-brand bg-brand-tint text-brand-strong" : "border-border text-ink-muted hover:text-ink")}>
            Todas
          </Link>
          {subjects.map((item) => (
            <Link
              key={item.subject}
              href={`/dashboard/anotacoes?materia=${encodeURIComponent(item.subject ?? "")}`}
              className={cn("rounded-full border px-3 py-1 text-sm no-underline", materia === item.subject ? "border-brand bg-brand-tint text-brand-strong" : "border-border text-ink-muted hover:text-ink")}
            >
              {item.subject} ({item._count._all})
            </Link>
          ))}
        </nav>
      ) : null}

      {notes.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-border-strong p-8 text-center text-sm text-ink-muted">
          {materia ? "Nenhuma anotação nesta matéria ainda." : "Nenhuma anotação ainda. Comece pelo botão Nova anotação ou anote dentro de uma questão."}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {notes.map((note) => {
            const href = contextHref(note);
            return (
              <li key={note.id} className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span>{dateFormat.format(note.createdAt)}</span>
                  {href ? (
                    <Link href={href} className="font-medium text-brand-strong no-underline hover:underline">
                      {noteContextLabel(note)}
                    </Link>
                  ) : (
                    <span>{noteContextLabel(note)}</span>
                  )}
                  <NoteItemActions id={note.id} content={note.content} />
                </div>
                <p className="m-0 whitespace-pre-line text-[15px] leading-6 text-ink">{note.content}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
