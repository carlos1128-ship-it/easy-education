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

  if (isDatabaseBusyError(error)) {
    return "Sistema temporariamente ocupado. Tente novamente em instantes.";
  }

  if (isAiUnavailableError(error)) {
    return "IA temporariamente ocupada. Tente novamente em instantes.";
  }

  if (error.message.includes("GEMINI_API_KEY")) {
    return "IA temporariamente indisponivel.";
  }

  if (
    error.message.includes("JSON valido") ||
    error.message.includes("interpretar resposta") ||
    error.message.includes("A IA retornou")
  ) {
    return "A IA retornou uma resposta incompleta. Tente gerar novamente.";
  }

  return fallback;
}

function statusForError(error: unknown) {
  if (error instanceof ZodError) return 400;
  if (isDatabaseBusyError(error)) return 503;
  if (isAiUnavailableError(error)) return 503;
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) return 503;
  if (
    error instanceof Error &&
    (
      error.message.includes("JSON valido") ||
      error.message.includes("interpretar resposta") ||
      error.message.includes("A IA retornou")
    )
  ) {
    return 502;
  }

  return 500;
}

function isDatabaseBusyError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("max clients reached") ||
    message.includes("too many connections") ||
    message.includes("emaxconnsession") ||
    message.includes("connection pool timeout")
  );
}

function isAiUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes('"code":503') ||
    message.includes("status: 503") ||
    message.includes("status 503")
  );
}

export function apiErrorResponse(error: unknown, options: ApiErrorOptions) {
  console.error(`[${options.scope}]`, error);

  return NextResponse.json(
    { error: publicErrorMessage(error, options.fallback) },
    { status: statusForError(error) },
  );
}
