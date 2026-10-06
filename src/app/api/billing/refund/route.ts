import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { refundWithinGuarantee } from "@/lib/billing";
import { checkRateLimit } from "@/lib/rate-limit";

/** Garantia de 7 dias: reembolso integral e cancelamento imediato. */
export async function POST() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`refund:${user.id}`, 3, 10 * 60_000).ok) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
    }
    await refundWithinGuarantee(user.id);
    revalidatePath("/dashboard/assinatura");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, { scope: "billing.refund", fallback: "Não foi possível concluir o reembolso. Fale com o suporte." });
  }
}
