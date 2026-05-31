export function devLog(message: string, details?: Record<string, string | number | boolean | null>) {
  if (process.env.NODE_ENV !== "development") return;
  console.info(`[Easy Education] ${message}`, details ?? {});
}

export function devWarn(message: string, details?: Record<string, string | number | boolean | null>) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[Easy Education] ${message}`, details ?? {});
}
