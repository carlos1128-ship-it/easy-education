import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { BillingError } from "@/lib/billing";
import { isAiOverloadError } from "@/lib/gemini";
import { PlanLimitError } from "@/lib/usage";

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

  if (error instanceof PlanLimitError) return error.message;
  if (error instanceof BillingError) return error.message;

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
  if (error instanceof PlanLimitError) return error.status;
  if (error instanceof BillingError) return error.status;
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
  return isAiOverloadError(error);
}

export function apiErrorResponse(error: unknown, options: ApiErrorOptions) {
  // Limite de plano é uma resposta esperada, não um erro do servidor: a interface usa os detalhes para abrir o modal de upgrade.
  if (error instanceof PlanLimitError) {
    return NextResponse.json({ error: error.message, ...error.info }, { status: error.status });
  }

  console.error(`[${options.scope}]`, error);

  return NextResponse.json(
    { error: publicErrorMessage(error, options.fallback) },
    { status: statusForError(error) },
  );
}
