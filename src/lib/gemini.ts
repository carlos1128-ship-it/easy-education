import { GoogleGenAI, type Content } from "@google/genai";
import type { ChatInputMessage } from "@/types";

const defaultModel = "gemini-2.5-flash";

let geminiClient: GoogleGenAI | null = null;

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

export async function generateJSON<T>(prompt: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await getGemini().models.generateContent({
      model: process.env.GEMINI_MODEL ?? defaultModel,
      contents: `${prompt}\n\nImportante: responda somente JSON valido, compacto, sem markdown e sem campos extras.`,
      config: {
        maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 8192),
        responseMimeType: "application/json",
        temperature: attempt === 0 ? 0.2 : 0,
      },
    });

    try {
      return parseJSON<T>(response.text ?? "");
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha ao interpretar resposta da IA.");
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
