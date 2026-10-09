import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { getAccessState } from "@/lib/billing";
import { generateTextFromImage } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertFeatureAvailable, withFeature } from "@/lib/usage";

const imageTypes = ["image/png", "image/jpeg", "image/webp"];

const INSTRUCTION = `Esta é a foto de uma redação escrita à mão ou impressa por um estudante.
Transcreva o texto exatamente como está escrito, em português, mantendo os parágrafos (uma linha em branco entre eles).
Não corrija erros de ortografia, gramática ou pontuação: a redação será corrigida depois.
Não inclua título, comentários, numeração de linhas nem markdown. Onde não der para ler, escreva [ilegível].`;

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    if (!checkRateLimit(`essay-transcribe:${user.id}`).ok) {
      return NextResponse.json({ error: "Muitas fotos em pouco tempo. Tente de novo em um minuto." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie uma foto da redação." }, { status: 400 });
    if (!imageTypes.includes(file.type)) return NextResponse.json({ error: "Envie a foto em PNG, JPG ou WebP." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Imagem acima de 10MB." }, { status: 400 });

    // Redação por foto: bloqueada no Gratuito e incluída no limite de redações dos planos pagos
    // (a leitura só acontece se ainda sobrar redação; o teto técnico de leituras fica em plans.ts).
    const { tier } = await getAccessState(user);
    await assertFeatureAvailable(user, "essay_photo_read", { tier });
    await assertFeatureAvailable(user, "essay_correction", { tier });
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await withFeature(user, "essay_photo_read", () => generateTextFromImage(buffer, file.type, INSTRUCTION), { tier });
    return NextResponse.json({ text });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "essay.transcribe",
      fallback: "Não foi possível ler a foto da redação.",
    });
  }
}
