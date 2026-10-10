import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { noteCreateSchema, noteFilterFromParams } from "@/lib/notes";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/** Anotações do aluno, filtradas pelo lugar onde foram escritas (?blockKey=..., ?questionId=..., ?subject=...). */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const filter = noteFilterFromParams(new URL(request.url).searchParams);
    const notes = await getPrisma().note.findMany({ where: { userId: user.id, ...filter }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ notes });
  } catch (error) {
    return apiErrorResponse(error, { scope: "notes.list", fallback: "Não foi possível carregar as anotações." });
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`notes:${user.id}`).ok) return NextResponse.json({ error: "Muitas anotações em pouco tempo. Espere um minuto." }, { status: 429 });
    const data = noteCreateSchema.parse(await request.json());
    const note = await getPrisma().note.create({ data: { ...data, userId: user.id } });
    revalidatePath("/dashboard/anotacoes");
    return NextResponse.json({ note });
  } catch (error) {
    return apiErrorResponse(error, { scope: "notes.create", fallback: "Não foi possível salvar a anotação." });
  }
}
