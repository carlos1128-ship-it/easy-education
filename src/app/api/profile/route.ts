import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { ensureProfileForUser } from "@/lib/profile";
import { getPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const text = await request.text();
    const body = text ? (JSON.parse(text) as { name?: string; studyGoal?: string; dailyMinutes?: number; studyMethod?: string }) : {};
    const profile = await ensureProfileForUser(user, body.name);
    const updated = await getPrisma().profile.update({
      where: { userId: user.id },
      data: {
        name: body.name?.trim() || profile.name,
        studyGoal: body.studyGoal?.trim() || profile.studyGoal,
        dailyMinutes: body.dailyMinutes ? Math.max(30, Math.min(600, body.dailyMinutes)) : profile.dailyMinutes,
        studyMethod: body.studyMethod?.trim() || profile.studyMethod,
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/configuracoes");

    return NextResponse.json({ profile: updated });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "profile",
      fallback: "Nao foi possivel preparar seu perfil.",
    });
  }
}
