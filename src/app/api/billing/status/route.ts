import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getAccessState } from "@/lib/billing";
import { getPrisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    const [access, profile] = await Promise.all([getAccessState(user), getPrisma().profile.findUnique({ where: { userId: user.id }, select: { onboardingDone: true } })]);
    return NextResponse.json({ hasAccess: access.hasAccess, destination: profile?.onboardingDone ? "/dashboard" : "/onboarding" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse(error, { scope: "billing.status", fallback: "Não foi possível verificar o acesso." }); }
}
