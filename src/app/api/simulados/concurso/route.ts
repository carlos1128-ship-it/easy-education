import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { concursoTarget, EXAM_BOARDS, goalLabel, parsePersonalization } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { startOfDaySP } from "@/lib/time-window";
import { withFeature } from "@/lib/usage";

/** Questões do simulado do dia do concurso. */
const CONCURSO_QUESTIONS = 30;
const TITLE_PREFIX = "Simulado do dia";

const targetSchema = z.object({
  role: z.string().trim().min(2, "Diga qual concurso ou cargo.").max(80),
  board: z.enum(EXAM_BOARDS as [string, ...string[]]).optional(),
});

/** Salva o concurso (cargo e banca) na personalização do aluno, para o simulado personalizado. */
export async function PATCH(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const payload = targetSchema.parse(await request.json());
    const prisma = getPrisma();
    const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { personalization: true } });
    const current = parsePersonalization(profile?.personalization);
    if (!current || current.purpose !== "concurso") return NextResponse.json({ error: "Seu objetivo não é concurso público." }, { status: 400 });
    const next = { ...current, role: payload.role, board: payload.board ?? current.board };
    await prisma.profile.update({ where: { userId: user.id }, data: { personalization: next as Prisma.InputJsonValue, studyGoal: goalLabel(next) } });
    revalidatePath("/dashboard/simulados");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "simulados.concurso.target", fallback: "Não foi possível salvar o concurso." });
  }
}

/**
 * Gera o simulado do dia do concurso do aluno, com IA, no estilo da banca. Um por dia: se o de hoje
 * já existe, devolve o mesmo (sem gastar o limite). Gerar gasta o limite de simulados por IA do plano.
 */
export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`quiz:${user.id}`).ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

    const prisma = getPrisma();
    const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { personalization: true } });
    const target = concursoTarget(profile?.personalization);
    if (!target?.role) return NextResponse.json({ error: "Conte primeiro qual concurso você vai fazer." }, { status: 400 });

    const existing = await prisma.quiz.findFirst({
      where: { userId: user.id, difficulty: "simulado", title: { startsWith: TITLE_PREFIX }, createdAt: { gte: startOfDaySP() } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ quizId: existing.id, reused: true });

    const board = target.board ? `, banca ${target.board}` : "";
    const quiz = await withFeature(user, "ai_simulado", () =>
      createSimuladoForUser({
        userId: user.id,
        subject: `Concurso: ${target.role}`.slice(0, 120),
        topic: `Simulado do concurso ${target.role}${board}. Distribua as questões entre as matérias que costumam cair no edital desse concurso (por exemplo, Língua Portuguesa, Raciocínio Lógico, Informática, Direito e os conhecimentos específicos do cargo), no estilo e no nível de cobrança da banca.`,
        title: `${TITLE_PREFIX} · ${target.role}`.slice(0, 120),
        questionCount: CONCURSO_QUESTIONS,
      }),
      { amount: CONCURSO_QUESTIONS },
    );
    revalidatePath("/dashboard/simulados");
    return NextResponse.json({ quizId: quiz.id, reused: false });
  } catch (error) {
    return apiErrorResponse(error, { scope: "simulados.concurso", fallback: "Não foi possível gerar o simulado." });
  }
}
