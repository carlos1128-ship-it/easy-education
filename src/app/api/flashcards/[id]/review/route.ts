import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

function nextReview(currentInterval: number, easeFactor: number, quality: "again" | "medium" | "good") {
  if (quality === "again") return { interval: 1, easeFactor: Math.max(1.3, easeFactor - 0.2) };
  if (quality === "medium") return { interval: Math.max(1, Math.round(currentInterval * 1.2)), easeFactor };
  return { interval: Math.max(1, Math.round(currentInterval * easeFactor)), easeFactor: easeFactor + 0.1 };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await context.params;
  const body = (await request.json()) as { quality: "again" | "medium" | "good" };
  const prisma = getPrisma();
  const card = await prisma.flashcard.findFirst({ where: { id, deck: { userId: user.id } } });
  if (!card) return NextResponse.json({ ok: true });

  const review = nextReview(card.interval, card.easeFactor, body.quality);
  const due = new Date();
  due.setDate(due.getDate() + review.interval);

  await prisma.flashcard.update({
    where: { id },
    data: { interval: review.interval, easeFactor: review.easeFactor, repetitions: card.repetitions + 1, nextReview: due },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/flashcards");
  revalidatePath("/dashboard/desempenho");

  return NextResponse.json({ ok: true, nextReview: due });
}
