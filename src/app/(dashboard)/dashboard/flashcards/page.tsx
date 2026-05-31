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
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Flashcards</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">Decks de revisao</h1>
      </div>

      <FlashcardCreateForm files={files.map((file) => ({ id: file.id, name: file.name, processed: file.processed }))} />

      {decks.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhum deck criado ainda." description="Gere flashcards com IA e revise com repeticao espacada." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => (
            <Link
              href={`/dashboard/flashcards/${deck.id}`}
              key={deck.id}
              className="rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition hover:border-[#4F46E5]/30"
            >
              <BookOpen className="size-6 text-[#4F46E5]" />
              <h2 className="mt-4 font-bold text-[#0F172A]">{deck.title}</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {deck.subject} · {deck._count.flashcards} cards
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
