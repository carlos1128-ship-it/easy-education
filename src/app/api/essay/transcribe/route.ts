import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { generateTextFromImage } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

const imageTypes = ["image/png", "image/jpeg", "image/webp"];

const INSTRUCTION = `Esta é a foto de uma redação escrita à mão ou impressa por um estudante.
Transcreva o texto exatamente como está escrito, em português, mantendo os parágrafos (uma linha em branco entre eles).
Não corrija erros de ortografia, gramática ou pontuação: a redação será corrigida depois.
Não inclua título, comentários, numeração de linhas nem markdown. Onde não der para ler, escreva [ilegível].`;

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user, "generation");
    if (!checkRateLimit(`essay-transcribe:${user.id}`).ok) {
      return NextResponse.json({ error: "Muitas fotos em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie uma foto da redação." }, { status: 400 });
    if (!imageTypes.includes(file.type)) return NextResponse.json({ error: "Envie a foto em PNG, JPG ou WebP." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Imagem acima de 10MB." }, { status: 400 });

    const text = await generateTextFromImage(Buffer.from(await file.arrayBuffer()), file.type, INSTRUCTION);
    return NextResponse.json({ text });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "essay.transcribe",
      fallback: "Não foi possível ler a foto da redação.",
    });
  }
}
