import { requireAdminApi } from "@/lib/admin";
import { apiErrorResponse } from "@/lib/api-error";
import { sourceLabel } from "@/lib/bank/labels";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csv(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""');
  return `"${text}"`;
}

/** Amostra para um professor revisar: até 10 questões não revisadas de cada área, em CSV (abre no Excel). */
export async function GET() {
  try {
    const { response } = await requireAdminApi();
    if (response) return response;
    const prisma = getPrisma();
    const areas = (await prisma.bankQuestion.findMany({ where: { origin: "prova_oficial" }, distinct: ["area"], select: { area: true } })).map((item) => item.area);
    const rows = (
      await Promise.all(
        areas.map((area) =>
          prisma.bankQuestion.findMany({
            where: { origin: "prova_oficial", area, reviewStatus: "nao_revisada" },
            include: { exam: { select: { name: true, styleLabel: true } }, subject: { select: { name: true } }, topic: { select: { name: true } } },
            orderBy: [{ year: "desc" }, { number: "asc" }],
            take: 10,
          }),
        ),
      )
    ).flat();

    const header = ["id", "fonte", "area", "materia", "assunto", "dificuldade_estimada", "gabarito_oficial", "status_resolucao", "publicada", "enunciado", "resolucao_da_ia"];
    const lines = rows.map((row) =>
      [row.id, sourceLabel(row), row.area, row.subject?.name, row.topic?.name, row.difficulty, row.correctLabel, row.explanationStatus, row.isPublished ? "sim" : "nao", row.statement, row.explanation].map(csv).join(","),
    );
    // BOM para o Excel abrir os acentos corretamente.
    const body = `﻿${header.join(",")}\n${lines.join("\n")}\n`;
    return new Response(body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="amostra-revisao-questoes.csv"' } });
  } catch (error) {
    return apiErrorResponse(error, { scope: "internal.bank.export", fallback: "Não foi possível exportar." });
  }
}
