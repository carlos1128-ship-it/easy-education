import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/gemini", () => ({ generateJSON: mocks.generate }));
import { explainOfficialQuestions } from "./ai";

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
const question = { text: "Analise o gráfico.", options: ["A) Cresce", "B) Diminui"], correctLabel: "A", images: ["https://example.com/grafico.png"] };
describe("explicação de questões ilustradas", () => {
  it("envia a imagem junto ao enunciado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } })));
    mocks.generate.mockResolvedValue([{ explanation: "O gráfico mostra crescimento contínuo da grandeza representada. A outra alternativa indica diminuição, contrariando a tendência observada." }]);
    expect((await explainOfficialQuestions([question]))[0]).toContain("crescimento");
    expect(mocks.generate).toHaveBeenCalledWith(expect.stringContaining("Analise o gráfico"), expect.objectContaining({ images: [{ mimeType: "image/png", data: "AQID" }] }));
  });
  it("não inventa resolução quando a imagem não está disponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(explainOfficialQuestions([question])).rejects.toThrow("imagens");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
