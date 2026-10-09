import { NextResponse } from "next/server";
import { z } from "zod";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { setBookmark } from "@/lib/bank/service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const { id } = await context.params;
    const { on } = z.object({ on: z.boolean() }).parse(await request.json());
    return NextResponse.json(await setBookmark(user.id, id, on));
  } catch (error) {
    return apiErrorResponse(error, { scope: "bank.bookmark", fallback: "Não foi possível marcar a questão." });
  }
}
