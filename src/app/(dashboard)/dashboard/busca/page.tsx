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
    { title: "Redacoes", icon: PenTool, items: essays.map((item) => ({ title: item.title, sub: item.theme ?? "Redação", href: "/dashboard/redacao" })) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Busca</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">
          Resultados para {query ? `"${query}"` : "sua pesquisa"}
        </h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map(({ title, icon: Icon, items }) => (
          <section key={title} className="rounded-[20px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Icon className="size-5 text-[#4F46E5]" />
              <h2 className="font-bold text-[#0F172A]">{title}</h2>
            </div>
            {items.length ? (
              <div className="space-y-2">
                {items.map((item) => (
                  <Link key={`${item.href}-${item.title}`} href={item.href} className="block rounded-xl border border-[#E2E8F0] p-3 transition-colors hover:border-[#4F46E5]/30">
                    <p className="font-semibold text-[#0F172A]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#64748B]">{item.sub}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">Nada encontrado aqui.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
