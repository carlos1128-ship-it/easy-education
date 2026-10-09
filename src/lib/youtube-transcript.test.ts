import { describe, expect, it } from "vitest";
import { pickTrack, transcriptText } from "@/lib/youtube-transcript";

describe("legenda do YouTube (sem IA)", () => {
  it("prefere português feito por pessoa, depois português automático, depois outro idioma", () => {
    const auto = { baseUrl: "a", languageCode: "pt", kind: "asr" };
    const manualEn = { baseUrl: "b", languageCode: "en" };
    const manualPt = { baseUrl: "c", languageCode: "pt-BR" };
    expect(pickTrack([manualEn, auto, manualPt])).toBe(manualPt);
    expect(pickTrack([manualEn, auto])).toBe(auto);
    expect(pickTrack([manualEn])).toBe(manualEn);
    expect(pickTrack([])).toBeNull();
  });

  it("junta as falas do trecho em blocos com a marca de tempo do vídeo original", () => {
    const data = {
      events: [
        { tStartMs: 5_000, segs: [{ utf8: "fora do trecho" }] },
        { tStartMs: 60_000, segs: [{ utf8: "Olá," }, { utf8: " turma" }] },
        { tStartMs: 70_000, segs: [{ utf8: "hoje é física" }] },
        { tStartMs: 95_000, segs: [{ utf8: "\n" }] },
        { tStartMs: 100_000, segs: [{ utf8: "força e massa" }] },
        { tStartMs: 200_000, segs: [{ utf8: "depois do fim" }] },
      ],
    };
    expect(transcriptText(data, 60, 120)).toBe("[01:00] Olá, turma hoje é física\n[01:40] força e massa");
  });
});
