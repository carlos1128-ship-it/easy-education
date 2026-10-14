// Public PDF endpoints maintained by the examination institutions. Never accept a
// user-supplied host, credentials, arbitrary ports, or redirects outside this list.
const HOSTS = new Set([
  "download.inep.gov.br", "www.fuvest.br", "acervo.fuvest.br",
  "www.comvest.unicamp.br", "vestibular.ita.br",
  "fatweb.s3.amazonaws.com", "vestibular.unesp.br", "documento.vunesp.com.br",
]);
export function isPublicExamPdf(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      HOSTS.has(url.hostname) && /\.pdf$/i.test(url.pathname);
  } catch { return false; }
}

export async function fetchPublicExamPdf(source: string): Promise<Uint8Array> {
  let url = source;
  const signal = AbortSignal.timeout(30000);
  for (let redirect = 0; redirect < 4; redirect++) {
    if (!isPublicExamPdf(url)) throw new Error("Endereço de documento não permitido.");
    const response = await fetch(url, { redirect: "manual", signal, cache: "no-store" });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      url = new URL(response.headers.get("location") || "", url).href;
      continue;
    }
    if (!response.ok || !response.body) throw new Error("Caderno temporariamente indisponível na instituição.");
    const limit = 30 * 1024 * 1024;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) throw new Error("O documento ultrapassa o limite de leitura.");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("A fonte não retornou um caderno PDF.");
    return bytes;
  }
  throw new Error("Não foi possível localizar o caderno original.");
}
