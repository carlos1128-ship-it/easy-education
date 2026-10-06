import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  MediaResolution,
  ThinkingLevel,
  type Content,
  type FunctionDeclaration,
  type Schema,
  type ThinkingConfig,
} from "@google/genai";
import type { ChatInputMessage } from "@/types";

const defaultModel = "gemini-2.5-flash";
const defaultFallbackModels = ["gemini-2.5-flash-lite"];
/** Modelos das listas (quiz, simulado, flashcards): os mais rápidos primeiro, com reserva de outra família. */
const defaultFastModels = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

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
    message.includes("unavailable") ||
    message.includes("demorou demais") ||
    message.includes("aborted") ||
    message.includes("timed out") ||
    message.includes("timeout")
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

/** Família 2.x usa orçamento de tokens; a 3.x usa nível de raciocínio. */
function thinkingFor(model: string, budget: number): ThinkingConfig {
  if (model.startsWith("gemini-2")) return { thinkingBudget: budget };
  return { thinkingLevel: budget > 0 ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL };
}

/** Uma tentativa nunca espera mais que `ms`: chamadas presas na API eram o que fazia passar de 1 minuto. */
function attemptSignal(ms: number, parent?: AbortSignal) {
  const signals = [AbortSignal.timeout(ms)];
  if (parent) signals.push(parent);
  return AbortSignal.any(signals);
}

/**
 * Gera JSON com a IA. Sem raciocínio interno por padrão: ele gasta o mesmo limite de tokens
 * da resposta, deixa a geração lenta e pode cortar o JSON no meio.
 */
export async function generateJSON<T>(
  prompt: string,
  options: { thinkingBudget?: number; attemptTimeoutMs?: number; schema?: Schema; temperature?: number } = {},
): Promise<T> {
  return withModels(async (model, attempt) => {
    const response = await getGemini().models.generateContent({
      model,
      contents: `${prompt}

Importante: responda somente JSON valido, compacto, sem markdown e sem campos extras.`,
      config: {
        maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 8192),
        responseMimeType: "application/json",
        temperature: attempt === 0 ? (options.temperature ?? 0.2) : 0,
        ...(options.schema ? { responseSchema: options.schema } : {}),
        thinkingConfig: thinkingFor(model, options.thinkingBudget ?? 0),
        abortSignal: attemptSignal(options.attemptTimeoutMs ?? 45_000),
      },
    });
    return parseJSON<T>(response.text ?? "");
  });
}

function fastModels() {
  const configured = (process.env.GEMINI_FAST_MODELS ?? defaultFastModels.join(","))
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return configured.length ? [...new Set(configured)] : configuredModels();
}

/** Prazo total de uma lista; meta do produto é entregar em até 20 s. */
const LIST_DEADLINE_MS = Number(process.env.GEMINI_LIST_DEADLINE_MS ?? 19_000);
/** Sem resposta neste tempo, a mesma parte é pedida em paralelo ao próximo modelo (fica a que chegar primeiro). */
const HEDGE_AFTER_MS = Number(process.env.GEMINI_HEDGE_AFTER_MS ?? 8_000);

class DeadlineError extends Error {}

/**
 * Gera uma parte da lista. Começa no modelo mais rápido; se ele falhar ou demorar mais que
 * HEDGE_AFTER_MS, dispara o próximo modelo em paralelo e usa a primeira resposta válida.
 */
async function generateChunk<T>(prompt: string, schema: Schema, deadline: number): Promise<T[]> {
  const models = fastModels();
  const controller = new AbortController();

  return new Promise<T[]>((resolve, reject) => {
    let started = 0;
    let running = 0;
    let settled = false;
    let lastError: unknown = null;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      controller.abort();
      fn();
    };

    const launch = () => {
      const remaining = deadline - Date.now();
      if (started >= models.length || remaining < 1500) {
        if (running === 0) finish(() => reject(lastError ?? new DeadlineError("A IA demorou demais para responder.")));
        return;
      }
      const model = models[started];
      started += 1;
      running += 1;
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(launch, HEDGE_AFTER_MS);

      getGemini()
        .models.generateContent({
          model,
          contents: prompt,
          config: {
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0.4,
            thinkingConfig: thinkingFor(model, 0),
            abortSignal: attemptSignal(remaining, controller.signal),
          },
        })
        .then((response) => {
          const parsed = parseJSON<unknown>(response.text ?? "");
          if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("A IA retornou uma lista vazia.");
          finish(() => resolve(parsed as T[]));
        })
        .catch((error: unknown) => {
          running -= 1;
          if (settled) return;
          lastError = error;
          launch();
        });
    };

    launch();
  });
}

/**
 * Gera uma lista (questões, flashcards) dividida em partes pequenas pedidas ao mesmo tempo.
 * Respostas menores saem bem mais rápido e uma parte lenta não segura as outras.
 * `buildPrompt(quantidade, parte, totalDePartes)` monta o pedido de cada parte.
 */
export async function generateJSONList<T>(options: {
  total: number;
  chunkSize: number;
  schema: Schema;
  buildPrompt: (count: number, part: number, parts: number) => string;
  /** Chave para remover itens repetidos entre partes. */
  dedupeKey?: (item: T) => string;
}): Promise<T[]> {
  const deadline = Date.now() + LIST_DEADLINE_MS;
  const parts = Math.max(1, Math.ceil(options.total / options.chunkSize));
  const sizes = Array.from({ length: parts }, (_, index) =>
    Math.floor(options.total / parts) + (index < options.total % parts ? 1 : 0),
  );

  const results = await Promise.allSettled(
    sizes.map((size, index) =>
      generateChunk<T>(
        `${options.buildPrompt(size, index + 1, parts)}

Importante: responda somente JSON valido, compacto, sem markdown e sem campos extras.`,
        options.schema,
        deadline,
      ).then((items) => items.slice(0, size)),
    ),
  );

  const seen = new Set<string>();
  const items: T[] = [];
  let firstError: unknown = null;
  for (const result of results) {
    if (result.status === "rejected") {
      firstError ??= result.reason;
      continue;
    }
    for (const item of result.value) {
      const key = options.dedupeKey?.(item);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      items.push(item);
    }
  }

  if (items.length === 0) {
    throw firstError instanceof Error ? firstError : new Error("Falha ao gerar resposta da IA.");
  }
  return items;
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

/**
 * Lê um vídeo público do YouTube (entrada nativa de URL do Gemini, em resolução baixa: ~100 tokens/s)
 * e devolve o texto pedido. Isolado aqui para trocar de estratégia sem mexer no resto do app.
 */
export async function generateTextFromYouTube(
  url: string,
  range: { startSeconds: number; endSeconds: number },
  instruction: string,
  options: { deadlineMs?: number } = {},
) {
  const deadline = Date.now() + (options.deadlineMs ?? 270_000);
  let lastError: unknown;
  for (const model of fastModels()) {
    const remaining = deadline - Date.now();
    if (remaining < 20_000) break;
    try {
      const response = await getGemini().models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: { fileUri: url, mimeType: "video/mp4" },
                videoMetadata: { startOffset: `${range.startSeconds}s`, endOffset: `${range.endSeconds}s` },
              },
              { text: instruction },
            ],
          },
        ],
        config: {
          maxOutputTokens: 12_288,
          temperature: 0.2,
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
          thinkingConfig: thinkingFor(model, 0),
          abortSignal: attemptSignal(remaining),
        },
      });
      const text = response.text?.trim();
      if (!text) throw new Error("A IA retornou resposta vazia.");
      return { text, model, inputTokens: response.usageMetadata?.promptTokenCount ?? 0, outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0 };
    } catch (error) {
      lastError = error;
      // Vídeo privado, removido ou sem permissão: outro modelo não resolve.
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("permission") || message.includes("private") || message.includes("not found") || message.includes("invalid_argument")) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("A IA demorou demais para responder.");
}
