import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { ExamError } from "./domain";

export function examError(error: unknown) {
  if (error instanceof ExamError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 6)
          .join(" "),
      },
      { status: 400 },
    );
  return apiErrorResponse(error, {
    scope: "past-exams",
    fallback: "Não foi possível concluir. Tente novamente.",
  });
}
export async function readJson(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ExamError("Origem não permitida.", 403);
  const raw = await request.text();
  if (raw.length > 2_000_000) throw new ExamError("Dados muito grandes.", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new ExamError("JSON inválido.");
  }
}
