import Link from "next/link";
import { ClipboardCheck, FileText, HelpCircle, Layers, PenTool } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

function searchVariants(query: string) {
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return [...new Set([query, normalized].filter(Boolean))];
}

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const variants = searchVariants(query);
  const prisma = getPrisma();

  const [quizzes, simulados, files, decks, essays] = query
    ? await Promise.all([
        prisma.quiz.findMany({
          where: {
            userId: user.id,
            difficulty: { not: "simulado" },
            OR: variants.flatMap((term) => [{ title: { contains: term, mode: "insensitive" } }, { subject: { contains: term, mode: "insensitive" } }]),
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.quiz.findMany({
          where: {
            userId: user.id,
            difficulty: "simulado",
            OR: variants.flatMap((term) => [{ title: { contains: term, mode: "insensitive" } }, { subject: { contains: term, mode: "insensitive" } }]),
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.uploadedFile.findMany({
          where: { userId: user.id, OR: variants.map((term) => ({ name: { contains: term, mode: "insensitive" } })) },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.flashcardDeck.findMany({
          where: {
            userId: user.id,
            OR: variants.flatMap((term) => [{ title: { contains: term, mode: "insensitive" } }, { subject: { contains: term, mode: "insensitive" } }]),
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.essay.findMany({
          where: {
            userId: user.id,
            OR: variants.flatMap((term) => [{ title: { contains: term, mode: "insensitive" } }, { theme: { contains: term, mode: "insensitive" } }]),
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], [], [], []];

  const groups = [
    { title: "Quizzes", icon: HelpCircle, items: quizzes.map((item) => ({ title: item.title, sub: `${item.subject} · ${item.questionCount} questões`, href: `/dashboard/quizzes/${item.id}` })) },
    { title: "Simulados", icon: ClipboardCheck, items: simulados.map((item) => ({ title: item.title, sub: `${item.subject} · ${item.questionCount} questões`, href: `/dashboard/simulados/${item.id}` })) },
    { title: "Arquivos", icon: FileText, items: files.map((item) => ({ title: item.name, sub: item.processed ? "Processado" : "Aguardando processamento", href: "/dashboard/arquivos" })) },
    { title: "Flashcards", icon: Layers, items: decks.map((item) => ({ title: item.title, sub: item.subject, href: `/dashboard/flashcards/${item.id}` })) },
    { title: "Redações", icon: PenTool, items: essays.map((item) => ({ title: item.title, sub: item.theme ?? "Redação", href: "/dashboard/redacao" })) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Busca</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Resultados para {query ? `"${query}"` : "sua pesquisa"}
        </h1>
        <form action="/dashboard/busca" role="search" className="mt-4 flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar estudos, arquivos ou quizzes…"
            aria-label="Buscar estudos, arquivos ou quizzes"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          />
          <button type="submit" className="h-11 rounded-lg bg-brand px-5 text-[15px] font-medium text-on-brand hover:bg-brand-strong">
            Buscar
          </button>
        </form>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map(({ title, icon: Icon, items }) => (
          <section key={title} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Icon className="size-5 text-brand-strong" />
              <h2 className="font-bold text-ink">{title}</h2>
            </div>
            {items.length ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <Link key={`${item.href}-${item.title}`} href={item.href} className="block rounded-lg border border-border p-3 transition-colors hover:border-border-strong">
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-sm text-ink-muted">{item.sub}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Nada encontrado aqui.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
