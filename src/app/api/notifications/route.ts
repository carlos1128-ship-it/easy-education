import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/notifications";

export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const notifications = await getNotificationsForUser(user.id);
    return NextResponse.json({ notifications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "notifications",
      fallback: "Não foi possível carregar as notificações.",
    });
  }
}
