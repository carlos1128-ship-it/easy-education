/**
 * Só aceita caminhos internos (ex.: "/dashboard"). Bloqueia "//site.com", "/\site.com", URLs completas
 * e caracteres de controle (o navegador remove tab/quebra de linha e "/\t/site.com" viraria "//site.com").
 */
export function safeInternalPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
