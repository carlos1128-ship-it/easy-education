import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { requireUser } from "@/lib/auth";
import { streamChat } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { truncateForContext } from "@/lib/pdf";
import { chatSchema } from "@/lib/validators";
import type { ChatInputMessage } from "@/types";

const systemPrompt = "Voce e um assistente educacional especializado. Ajuda estudantes brasileiros com duvidas, resumos, planos de estudo, e geracao de questoes. Responda sempre em portugues. Seja didatico, claro e objetivo. Para questoes de ENEM, siga o estilo e a linguagem das provas reais.";

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const rateLimit = checkRateLimit(`chat:${user.id}`);
    if (!rateLimit.ok) return NextResponse.json({ error: "Limite de 20 requests/min atingido." }, { status: 429 });

    const payload = chatSchema.parse(await request.json());
    const prisma = getPrisma();
    let context = "";

    if (payload.fileId) {
      const file = await prisma.uploadedFile.findFirst({ where: { id: payload.fileId, userId: user.id } });
      if (file?.textContent) context = `\n\nContexto do arquivo:\n${truncateForContext(file.textContent)}`;
    }

    const messages: ChatInputMessage[] = payload.messages.map((message, index) => ({
      role: message.role,
      content: index === payload.messages.length - 1 ? `${message.content}${context}` : message.content,
    }));

    const encoder = new TextEncoder();
    let assistantContent = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const geminiStream = await streamChat(messages, systemPrompt);
          for await (const chunk of geminiStream) {
            const text = chunk.text ?? "";
            if (!text) continue;
            assistantContent += text;
            controller.enqueue(encoder.encode(text));
          }

          const lastUser = payload.messages[payload.messages.length - 1];
          await prisma.chatMessage.createMany({
            data: [
              { userId: user.id, role: "user", content: lastUser.content, fileId: payload.fileId },
              { userId: user.id, role: "assistant", content: assistantContent, fileId: payload.fileId },
            ],
          });
        } catch (error) {
          console.error("[chat.stream]", error);
          const message = error instanceof Error && error.message.includes("GEMINI_API_KEY")
            ? "IA temporariamente indisponivel."
            : "Erro ao gerar resposta.";
          controller.enqueue(encoder.encode(message));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "chat",
      fallback: "Nao foi possivel conversar com a IA.",
    });
  }
}
