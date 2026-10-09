import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { ENEM_AREAS } from "@/lib/bank/constants";
import { BankError, createSession, parseFilters, pickQuestionIds, pickSimuladoQuestionIds } from "@/lib/bank/service";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const filtersSchema = z
  .object({
    exam: z.string().max(40).optional(),
    year: z.number().int().optional(),
    area: z.string().max(40).optional(),
    subject: z.string().max(60).optional(),
    topic: z.string().max(80).optional(),
    difficulty: z.string().max(10).optional(),
    status: z.string().max(20).optional(),
  })
  .default({});

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("practice"), filters: filtersSchema, count: z.number().int().min(1).max(50).default(10) }),
  z.object({ kind: z.literal("simulado"), exam: z.string().max(40), year: z.number().int(), area: z.string().max(40).optional() }),
  z.object({ kind: z.literal("diagnostic"), exam: z.string().max(40).default("enem") }),
]);

/** Cria uma sessão do banco: prática com filtros, simulado de prova passada ou diagnóstico. Sem IA, sem custo. */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`bank-session:${user.id}`, 20, 60_000).ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

    const payload = schema.parse(await request.json());

    if (payload.kind === "practice") {
      const raw = Object.fromEntries(
        Object.entries({ exame: payload.filters.exam, ano: payload.filters.year?.toString(), area: payload.filters.area, materia: payload.filters.subject, assunto: payload.filters.topic, dificuldade: payload.filters.difficulty, status: payload.filters.status }).filter(([, value]) => value),
      );
      const ids = await pickQuestionIds(user.id, parseFilters(raw), payload.count);
      const session = await createSession({ userId: user.id, kind: "practice", title: "Prática com questões do banco", questionIds: ids, examSlug: payload.filters.exam });
      return NextResponse.json({ sessionId: session.id, total: ids.length });
    }

    if (payload.kind === "simulado") {
      const ids = await pickSimuladoQuestionIds(user.id, { exam: payload.exam, year: payload.year, area: payload.area });
      const area = payload.area ? ` · ${ENEM_AREAS[payload.area] ?? payload.area}` : " · prova completa";
      // Tempo de prova proporcional: 3 minutos por questão, como referência de ritmo.
      const session = await createSession({
        userId: user.id,
        kind: "simulado",
        title: `Simulado ${payload.exam.toUpperCase()} ${payload.year}${area}`,
        questionIds: ids,
        examSlug: payload.exam,
        timeLimitSec: ids.length * 3 * 60,
      });
      return NextResponse.json({ sessionId: session.id, total: ids.length });
    }

    // Diagnóstico: poucas questões de cada área do exame, para o ponto de partida do aluno.
    const prisma = getPrisma();
    const areas = (await prisma.bankQuestion.findMany({ where: { exam: { slug: payload.exam }, isPublished: true, origin: "prova_oficial", area: { not: null } }, distinct: ["area"], select: { area: true } })).flatMap((item) => (item.area ? [item.area] : []));
    if (!areas.length) throw new BankError("O banco ainda não tem questões publicadas deste exame para o diagnóstico.", 404);
    const perArea = Math.max(2, Math.floor(12 / areas.length));
    const picked = (await Promise.all(areas.map((area) => pickQuestionIds(user.id, { exam: payload.exam, area, origin: "prova_oficial" }, perArea)))).flat();
    const session = await createSession({ userId: user.id, kind: "diagnostic", title: "Simulado diagnóstico", questionIds: picked, examSlug: payload.exam, timeLimitSec: picked.length * 3 * 60 });
    return NextResponse.json({ sessionId: session.id, total: picked.length });
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.sessions", fallback: "Não foi possível iniciar a prática." });
  }
}
