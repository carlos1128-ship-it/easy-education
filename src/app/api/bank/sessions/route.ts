import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { ENEM_DAYS, ENEM_LANGUAGES, pickEnemSimulado, type EnemDay, type EnemLanguage } from "@/lib/bank/enem-simulado";
import { BankError, createSession, pickQuestionIds } from "@/lib/bank/service";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("enem"),
    day: z.enum(Object.keys(ENEM_DAYS) as [EnemDay, ...EnemDay[]]),
    language: z.enum(Object.keys(ENEM_LANGUAGES) as [EnemLanguage, ...EnemLanguage[]]).default("ingles"),
  }),
  z.object({ kind: z.literal("diagnostic"), exam: z.string().max(40).default("enem") }),
]);

/** Cria um simulado de provas anteriores do ENEM (1º dia, 2º dia ou completo) ou o diagnóstico. Sem IA, sem custo. */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`bank-session:${user.id}`, 20, 60_000).ok) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

    const payload = schema.parse(await request.json());

    if (payload.kind === "enem") {
      const config = ENEM_DAYS[payload.day];
      const ids = await pickEnemSimulado(user.id, payload.day, payload.language);
      const languageNote = (config.areas as readonly string[]).includes("linguagens") ? ` · ${ENEM_LANGUAGES[payload.language]}` : "";
      const session = await createSession({
        userId: user.id,
        kind: "simulado",
        title: `Simulado ENEM · ${config.label}${languageNote}`,
        questionIds: ids,
        examSlug: "enem",
        timeLimitSec: config.timeLimitSec,
      });
      return NextResponse.json({ sessionId: session.id, total: ids.length });
    }

    // Diagnóstico: poucas questões de cada área do exame, para o ponto de partida do aluno.
    const prisma = getPrisma();
    const areas = (await prisma.bankQuestion.findMany({ where: { exam: { slug: payload.exam }, isPublished: true, origin: "prova_oficial", area: { not: null } }, distinct: ["area"], select: { area: true } })).flatMap((item) => (item.area ? [item.area] : []));
    if (!areas.length) throw new BankError("Ainda não há questões publicadas deste exame para o diagnóstico.", 404);
    const perArea = Math.max(2, Math.floor(12 / areas.length));
    const picked = (await Promise.all(areas.map((area) => pickQuestionIds(user.id, { exam: payload.exam, area, origin: "prova_oficial" }, perArea)))).flat();
    const session = await createSession({ userId: user.id, kind: "diagnostic", title: "Simulado diagnóstico", questionIds: picked, examSlug: payload.exam, timeLimitSec: picked.length * 3 * 60 });
    return NextResponse.json({ sessionId: session.id, total: picked.length });
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.sessions", fallback: "Não foi possível iniciar o simulado." });
  }
}
