import { describe, expect, it } from "vitest";
import { EXPLANATION_UNAVAILABLE, needsOfficialExplanation, normalizeOfficialExplanation } from "@/lib/bank/explanation-quality";

describe("resoluções de questões oficiais", () => {
  it("reconhece explicações ausentes e o placeholder antigo do gabarito", () => {
    expect(needsOfficialExplanation(null, "B")).toBe(true);
    expect(needsOfficialExplanation("Gabarito oficial da prova: alternativa B.", "B")).toBe(true);
    expect(needsOfficialExplanation("A alternativa B está correta porque ...", "B")).toBe(false);
  });

  it("aceita uma explicação concisa e rejeita placeholders, texto curto e texto longo", () => {
    const explanation = "A alternativa B explica o resultado porque a relação entre força e massa é proporcional. As demais alternativas invertem a relação ou ignoram a unidade usada no enunciado.";
    expect(normalizeOfficialExplanation(explanation)).toBe(explanation);
    expect(normalizeOfficialExplanation("Gabarito oficial: alternativa B.")).toBeNull();
    expect(normalizeOfficialExplanation("Alternativa B.")).toBeNull();
    expect(normalizeOfficialExplanation("explicação ".repeat(400))).toBeNull();
  });

  it("usa um aviso explícito quando o orçamento não permite criar uma resolução", () => {
    expect(EXPLANATION_UNAVAILABLE).toContain("não está disponível");
  });
});
