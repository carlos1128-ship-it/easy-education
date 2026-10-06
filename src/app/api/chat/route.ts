import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { assertDailyAiQuota } from "@/lib/ai-quota";
import { requireUser } from "@/lib/auth";
import { ChatActionError, chatSystemPrompt, chatTools, runChatTool, type ChatAction } from "@/lib/chat-agent";
import { generateChatWithTools } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { truncateForContext } from "@/lib/text";
import { chatSchema } from "@/lib/validators";
import type { ChatInputMessage } from "@/types";

// O chat faz até duas chamadas à IA em sequência (entender o pedido e gerar o quiz/plano).
export const maxDuration = 300;

/** Remove marcações de markdown que escapem do prompt (asteriscos, títulos com #). */
function toPlainText(value: string) {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|\s)\*(?!\s)([^*\n]+?)\*(?=\s|[.,;:!?)]|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*•]\s+/gm, "- ")
    .replace(/`{3}[a-z]*\n?/g, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;
    await assertDailyAiQuota(user, "chat");

    const rateLimit = checkRateLimit(`chat:${user.id}`);
    if (!rateLimit.ok) return NextResponse.json({ error: "Limite de 20 mensagens por minuto atingido." }, { status: 429 });

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

    const result = await generateChatWithTools(messages, chatSystemPrompt, chatTools);
    let content: string;
    let action: ChatAction | undefined;

    if (result.kind === "call") {
      try {
        const executed = await runChatTool(user.id, result.name, result.args);
        content = executed.reply;
        action = executed.action;
      } catch (error) {
        if (error instanceof ChatActionError) return NextResponse.json({ error: error.message }, { status: error.status });
        throw error;
      }
    } else {
      content = toPlainText(result.text);
    }

    const lastUser = payload.messages[payload.messages.length - 1];
    await prisma.chatMessage.createMany({
      data: [
        { userId: user.id, role: "user", content: lastUser.content, fileId: payload.fileId },
        { userId: user.id, role: "assistant", content, fileId: payload.fileId },
      ],
    });

    return NextResponse.json({ content, action });
  } catch (error) {
    return apiErrorResponse(error, {
      scope: "chat",
      fallback: "Não foi possível conversar com a IA.",
    });
  }
}
