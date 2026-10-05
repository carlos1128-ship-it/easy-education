import Link from "next/link";
import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashcardCreateForm } from "@/components/flashcard/flashcard-create-form";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function FlashcardsPage() {
  const user = await getCurrentUserOrRedirect();
  const prisma = getPrisma();
  const [decks, files] = await Promise.all([
    prisma.flashcardDeck.findMany({
      where: { userId: user.id },
      include: { _count: { select: { flashcards: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, processed: true } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Flashcards</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Decks de revisão</h1>
      </div>

      <FlashcardCreateForm files={files.map((file) => ({ id: file.id, name: file.name, processed: file.processed }))} />

      {decks.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhum deck criado ainda." description="Gere flashcards com IA e revise com repeticao espacada." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {decks.map((deck) => (
            <Link
              href={`/dashboard/flashcards/${deck.id}`}
              key={deck.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:border-border-strong"
            >
              <BookOpen className="size-6 text-brand-strong" />
              <h2 className="mt-4 font-bold text-ink">{deck.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {deck.subject} · {deck._count.flashcards} cards
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
