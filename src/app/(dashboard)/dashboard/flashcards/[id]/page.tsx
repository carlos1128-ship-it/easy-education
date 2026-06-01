import { notFound } from "next/navigation";
import { FlashcardReview } from "@/components/flashcard/flashcard-review";
import { getPrisma } from "@/lib/prisma";
import { getCurrentUserOrRedirect } from "@/lib/server-user";

export default async function FlashcardDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUserOrRedirect();
  const { id } = await params;
  const deck = await getPrisma().flashcardDeck.findFirst({
    where: { id, userId: user.id },
    include: { flashcards: { where: { nextReview: { lte: new Date() } }, orderBy: { nextReview: "asc" } } },
  });

  if (!deck) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-[#4F46E5]">Revisão</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{deck.title}</h1>
      </div>
      <FlashcardReview cards={deck.flashcards} />
    </div>
  );
}
