export function truncateForContext(text: string, maxChars = 15000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Conteudo truncado para caber no contexto]`;
}

export function extractTextFromBuffer(buffer: Buffer, type: string): string {
  if (type.startsWith("text/") || type === "application/json") {
    return buffer.toString("utf8").replace(/^\uFEFF/, "");
  }

  throw new Error("Tipo de arquivo sem extracao de texto automatica.");
}
