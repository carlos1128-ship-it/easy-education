import Link from "next/link";
import { BookOpen, Check, Layers } from "lucide-react";
import { SubjectIcon } from "@/components/bank/subject-icon";
import { ReadyDeckButton } from "@/components/flashcard/ready-deck-button";
import { READY_DECKS } from "@/content/flashcards";
import { addedReadyDeckIds } from "@/lib/ready-flashcards";
import { LockedNotice } from "@/components/plan/usage-hint";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashcardCreateForm } from "@/components/flashcard/flashcard-create-form";
import { allowanceFor } from "@/lib/plans";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";

export default async function FlashcardsPage() {
  const { user, access } = await getStudentOrRedirect();
  const aiLocked = allowanceFor(access.tier, "ai_flashcards").kind === "locked";
  const prisma = getPrisma();
  const [decks, files, added] = await Promise.all([
    prisma.flashcardDeck.findMany({
      where: { userId: user.id },
      include: { _count: { select: { flashcards: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.uploadedFile.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, processed: true } }),
    addedReadyDeckIds(user.id),
  ]);
  // Baralhos prontos agrupados por matéria (na ordem do conteúdo).
  const readyBySubject = READY_DECKS.reduce<Array<{ subject: string; slug: string; decks: typeof READY_DECKS }>>((groups, deck) => {
    const group = groups.find((item) => item.slug === deck.subjectSlug);
    if (group) group.decks.push(deck);
    else groups.push({ subject: deck.subject, slug: deck.subjectSlug, decks: [deck] });
    return groups;
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-6">
      <div>
        <p className="text-sm font-medium text-brand-strong">Flashcards</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Decks de revisão</h1>
      </div>

      {aiLocked ? (
        <LockedNotice
          feature="ai_flashcards"
          title="Flashcards gerados por IA fazem parte dos planos pagos"
          description="Para gerar decks de flashcards sobre qualquer assunto ou material seu, escolha um plano pago."
        />
      ) : (
        <div className="space-y-3">
          <FlashcardCreateForm files={files.map((file) => ({ id: file.id, name: file.name, processed: file.processed }))} />
        </div>
      )}

      {/* Baralhos prontos: revisão sem esperar a IA. */}
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card lg:p-6" aria-labelledby="baralhos-prontos">
        <div className="flex flex-col gap-1">
          <h2 id="baralhos-prontos" className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
            <Layers className="size-5 text-brand-strong" aria-hidden="true" /> Baralhos prontos
          </h2>
          <p className="m-0 max-w-[760px] text-sm text-ink-muted">
            {READY_DECKS.length} baralhos com o essencial de cada matéria do Ensino Médio e do ENEM. Escolha um e comece a revisar na hora; os cartões voltam no dia certo.
          </p>
        </div>
        <div className="space-y-5">
          {readyBySubject.map((group) => (
            <div key={group.slug} className="space-y-2.5">
              <h3 className="m-0 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em] text-ink-muted">
                <SubjectIcon slug={group.slug} className="size-7" size={15} /> {group.subject}
              </h3>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {group.decks.map((deck) => {
                  const deckId = added.get(deck.slug);
                  return (
                    <li key={deck.slug} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-ink" title={deck.topic}>{deck.topic}</span>
                        <span className="text-xs text-ink-muted">{deck.cards.length} cartões</span>
                      </span>
                      {deckId ? (
                        <Link href={`/dashboard/flashcards/${deckId}`} className="inline-flex min-h-9 flex-none items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm font-semibold text-ink no-underline hover:bg-surface-muted">
                          <Check size={15} className="text-success" aria-hidden="true" /> Revisar
                        </Link>
                      ) : (
                        <ReadyDeckButton slug={deck.slug} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {decks.length === 0 ? (
        <EmptyState icon={BookOpen} owl="estudante" title="Nenhum deck criado ainda." description="Gere flashcards com IA e revise com repeticao espacada." />
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
