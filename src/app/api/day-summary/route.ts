import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { collectStudiedToday, correctDaySummary, daySummarySchema, hasStudied } from "@/lib/day-summary";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { dayKeySP } from "@/lib/study-completion";
import { withFeature } from "@/lib/usage";

export const maxDuration = 60;

/** Resumo de hoje (se já existe) e o que o aluno estudou hoje. */
export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const [summary, studied] = await Promise.all([
      getPrisma().daySummary.findUnique({ where: { userId_day: { userId: user.id, day: dayKeySP() } } }),
      collectStudiedToday(user.id),
    ]);
    return NextResponse.json({ summary, studied });
  } catch (error) {
    return apiErrorResponse(error, { scope: "day-summary.get", fallback: "Não foi possível carregar o resumo do dia." });
  }
}

/** Envia o resumo do dia (200 a 5.000 caracteres) e devolve a correção da IA. Um por dia. */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`day-summary:${user.id}`, 5).ok) return NextResponse.json({ error: "Muitas tentativas. Espere um minuto." }, { status: 429 });
    const { content } = daySummarySchema.parse(await request.json());
    const prisma = getPrisma();
    const day = dayKeySP();

    const existing = await prisma.daySummary.findUnique({ where: { userId_day: { userId: user.id, day } }, select: { feedback: true } });
    if (existing?.feedback) return NextResponse.json({ error: "Você já fechou o dia de hoje. Amanhã tem outro." }, { status: 409 });

    const studied = await collectStudiedToday(user.id);
    if (!hasStudied(studied)) {
      return NextResponse.json({ error: "Ainda não há estudo registrado hoje. Faça um bloco do plano ou um quiz e depois feche o dia." }, { status: 400 });
    }

    const feedback = await withFeature(user, "day_summary", () => correctDaySummary(user.id, content, studied));
    const data = { content, studied: studied as unknown as Prisma.InputJsonValue, feedback: feedback as unknown as Prisma.InputJsonValue };
    const summary = await prisma.daySummary.upsert({
      where: { userId_day: { userId: user.id, day } },
      create: { userId: user.id, day, ...data },
      update: data,
    });
    revalidatePath("/dashboard/fechar-dia");
    revalidatePath("/dashboard");
    return NextResponse.json({ summary });
  } catch (error) {
    return apiErrorResponse(error, { scope: "day-summary.post", fallback: "Não foi possível corrigir o resumo." });
  }
}
