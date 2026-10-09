import { readApiJson } from "@/lib/client-response";
import { createClient } from "@/lib/supabase/client";

/**
 * Envia um material (PDF, texto ou foto). O servidor confere o plano e os limites e devolve uma URL assinada;
 * o arquivo vai direto do navegador para o Storage, sem passar pelo limite de corpo das funções da Vercel.
 */
export async function uploadMaterial(file: File): Promise<{ id: string }> {
  const response = await fetch("/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name || "arquivo", type: file.type, size: file.size }),
  });
  const data = await readApiJson<{ file?: { id: string }; upload?: { path: string; token: string } }>(response, "Falha no envio.");
  if (!response.ok || !data.file || !data.upload) throw new Error(data.error ?? "Falha no envio.");

  const { error } = await createClient().storage.from("arquivos").uploadToSignedUrl(data.upload.path, data.upload.token, file, { contentType: file.type });
  if (error) {
    // Não deixa um registro sem arquivo na lista do aluno.
    await fetch(`/api/files/${data.file.id}/process`, { method: "DELETE" }).catch(() => undefined);
    throw new Error("Falha ao enviar o arquivo. Tente de novo.");
  }
  return { id: data.file.id };
}
