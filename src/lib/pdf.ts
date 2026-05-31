import { PDFParse } from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const data = await parser.getText();
    return data.text;
  } finally {
    await parser.destroy();
  }
}

export function truncateForContext(text: string, maxChars = 15000): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Conteudo truncado para caber no contexto]`;
}
