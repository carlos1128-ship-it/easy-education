import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ApiErrorOptions = {
  fallback: string;
  scope: string;
};

function publicErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados invalidos.";
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.includes("GEMINI_API_KEY")) {
    return process.env.NODE_ENV === "production"
      ? "IA temporariamente indisponivel."
      : error.message;
  }

  if (
    error.message.includes("JSON valido") ||
    error.message.includes("interpretar resposta")
  ) {
    return "A IA retornou uma resposta inesperada. Tente novamente.";
  }

  return fallback;
}

function statusForError(error: unknown) {
  if (error instanceof ZodError) return 400;
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) return 503;
  if (
    error instanceof Error &&
    (error.message.includes("JSON valido") || error.message.includes("interpretar resposta"))
  ) {
    return 502;
  }

  return 500;
}

export function apiErrorResponse(error: unknown, options: ApiErrorOptions) {
  console.error(`[${options.scope}]`, error);

  return NextResponse.json(
    { error: publicErrorMessage(error, options.fallback) },
    { status: statusForError(error) },
  );
}
