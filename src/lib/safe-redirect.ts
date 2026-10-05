/** Só aceita caminhos internos (ex.: "/dashboard"). Bloqueia "//site.com", "/\site.com" e URLs completas. */
export function safeInternalPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
