import { FunctionCallingConfigMode, GoogleGenAI, type Content, type FunctionDeclaration } from "@google/genai";
import type { ChatInputMessage } from "@/types";

const defaultModel = "gemini-2.5-flash";
const defaultFallbackModels = ["gemini-2.5-flash-lite"];

let geminiClient: GoogleGenAI | null = null;

/** Raciocínio curto no chat: respostas mais rápidas sem cortar o texto (limite de 2048 tokens). */
const CHAT_THINKING_BUDGET = 512;

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.startsWith("sua_")) {
    throw new Error("GEMINI_API_KEY nao configurada.");
  }

  return apiKey;
}

export function getGemini() {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: getGeminiApiKey(),
    });
  }

  return geminiClient;
}

function configuredModels() {
  const primary = process.env.GEMINI_MODEL ?? defaultModel;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? defaultFallbackModels.join(","))
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([primary, ...fallbacks])];
}

function cleanJSON(text: string) {
  return text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

function parseJSON<T>(text: string): T {
  const cleaned = cleanJSON(text);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstArray = cleaned.indexOf("[");
    const firstObject = cleaned.indexOf("{");
    const first = firstArray === -1 ? firstObject : firstObject === -1 ? firstArray : Math.min(firstArray, firstObject);
    const last = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1)) as T;
    }
    throw new Error("Resposta da IA nao veio em JSON valido.");
  }
}

/** IA sobrecarregada ou sem cota (429/503): não adianta repetir no mesmo modelo. */
export function isAiOverloadError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("resource_exhausted") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("unavailable")
  );
}

/** Tempo máximo somando todas as tentativas; fica abaixo do limite das funções (120 s). */
const AI_DEADLINE_MS = Number(process.env.GEMINI_DEADLINE_MS ?? 95_000);

/**
 * Tenta cada modelo configurado. Se o modelo estiver sobrecarregado, passa direto para o próximo;
 * em outro erro (ex.: JSON incompleto), tenta mais uma vez no mesmo modelo. Para no prazo total.
 */
async function withModels<T>(run: (model: string, attempt: number) => Promise<T>, attemptsPerModel = 2): Promise<T> {
  const started = Date.now();
  let lastError: unknown;

  for (const model of configuredModels()) {
    for (let attempt = 0; attempt < attemptsPerModel; attempt += 1) {
      if (Date.now() - started > AI_DEADLINE_MS) {
        throw lastError instanceof Error ? lastError : new Error("A IA demorou demais para responder.");
      }
      try {
        return await run(model, attempt);
      } catch (error) {
        lastError = error;
        if (isAiOverloadError(error)) break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha ao gerar resposta da IA.");
}

/**
 * Gera JSON com a IA. Sem raciocínio interno por padrão: ele gasta o mesmo limite de tokens
 * da resposta, deixa a geração lenta e pode cortar o JSON no meio.
 */
export async function generateJSON<T>(prompt: string, options: { thinkingBudget?: number } = {}): Promise<T> {
  return withModels(async (model, attempt) => {
    const response = await getGemini().models.generateContent({
      model,
      contents: `${prompt}

Importante: responda somente JSON valido, compacto, sem markdown e sem campos extras.`,
      config: {
        maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 8192),
        responseMimeType: "application/json",
        temperature: attempt === 0 ? 0.2 : 0,
        thinkingConfig: { thinkingBudget: options.thinkingBudget ?? 0 },
      },
    });
    return parseJSON<T>(response.text ?? "");
  });
}

function toGeminiContents(messages: ChatInputMessage[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export async function streamChat(messages: ChatInputMessage[], systemPrompt: string) {
  return getGemini().models.generateContentStream({
    model: process.env.GEMINI_MODEL ?? defaultModel,
    contents: toGeminiContents(messages),
    config: {
      maxOutputTokens: 2048,
      systemInstruction: systemPrompt,
      temperature: 0.6,
    },
  });
}

export async function generateChatText(messages: ChatInputMessage[], systemPrompt: string) {
  return withModels(async (model, attempt) => {
    const response = await getGemini().models.generateContent({
      model,
      contents: toGeminiContents(messages),
      config: {
        maxOutputTokens: 2048,
        systemInstruction: systemPrompt,
        temperature: attempt === 0 ? 0.6 : 0.2,
        thinkingConfig: { thinkingBudget: CHAT_THINKING_BUDGET },
      },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("A IA retornou resposta vazia.");
    return text;
  });
}

export type ChatToolResult =
  | { kind: "text"; text: string }
  | { kind: "call"; name: string; args: Record<string, unknown> };

/**
 * Conversa com a IA podendo chamar funções (criar quiz, plano, flashcards...).
 * Devolve o texto da resposta ou a primeira função que a IA quer executar.
 */
export async function generateChatWithTools(
  messages: ChatInputMessage[],
  systemPrompt: string,
  functionDeclarations: FunctionDeclaration[],
): Promise<ChatToolResult> {
  return withModels(async (model, attempt) => {
    const response = await getGemini().models.generateContent({
      model,
      contents: toGeminiContents(messages),
      config: {
        maxOutputTokens: 2048,
        systemInstruction: systemPrompt,
        temperature: attempt === 0 ? 0.5 : 0.2,
        thinkingConfig: { thinkingBudget: CHAT_THINKING_BUDGET },
        tools: [{ functionDeclarations }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      },
    });

    const call = response.functionCalls?.[0];
    if (call?.name) return { kind: "call", name: call.name, args: (call.args ?? {}) as Record<string, unknown> };

    const text = response.text?.trim();
    if (!text) throw new Error("A IA retornou resposta vazia.");
    return { kind: "text", text };
  });
}

/** Lê uma imagem (foto de caderno, redação, apostila) e devolve o texto extraído. */
export async function generateTextFromImage(image: Buffer, mimeType: string, instruction: string) {
  return withModels(async (model) => {
    const response = await getGemini().models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType, data: image.toString("base64") } }, { text: instruction }],
        },
      ],
      config: { maxOutputTokens: 8192, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = response.text?.trim();
    if (!text) throw new Error("A IA não encontrou texto na imagem.");
    return text;
  }, 1);
}
