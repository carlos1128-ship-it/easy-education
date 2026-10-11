import { describe, expect, it } from "vitest";
import { etecQuestionCount, parseEtecAnswerKey } from "@/lib/bank/etec";
import { isUltrasecret, ultrasecretLocked } from "@/lib/bank/ultrasecret";

describe("gabarito do Vestibulinho ETEC", () => {
  it("lê duas colunas por linha e números com zeros à esquerda", () => {
    const text = "Questão Alternativa Critério\n1 E C2 26 D C5\n2 D C3 27 C C3\n001 B C1";
    const key = parseEtecAnswerKey(text);
    expect(key.get(1)).toBe("E");
    expect(key.get(26)).toBe("D");
    expect(key.get(27)).toBe("C");
    expect(etecQuestionCount(text)).toBe(27);
  });

  it("deixa a questão anulada fora, mas conta no total", () => {
    const text = "22 \tB \tC1 \t47 \tC \tC1\n23 \tANULADA \tC1 \t48 \tC \tC5";
    const key = parseEtecAnswerKey(text);
    expect(key.has(23)).toBe(false);
    expect(key.get(48)).toBe("C");
    expect(etecQuestionCount(text)).toBe(48);
  });
});

describe("questão ultrassecreta", () => {
  const ids = Array.from({ length: 400 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);

  it("só vale para os assuntos que mais caem, e para cerca de 1 em 4 deles", () => {
    const top = ["matematica"];
    const marked = ids.filter((id) => isUltrasecret({ id, subject: { slug: "matematica" } }, top)).length;
    expect(marked).toBeGreaterThan(60);
    expect(marked).toBeLessThan(140);
    expect(ids.some((id) => isUltrasecret({ id, subject: { slug: "historia" } }, top))).toBe(false);
  });

  it("é fixa: a mesma questão sempre dá o mesmo resultado", () => {
    const question = { id: ids[7], area: "matematica" };
    expect(isUltrasecret(question, ["matematica"])).toBe(isUltrasecret(question, ["matematica"]));
  });

  it("tranca no Básico e abre no Completo", () => {
    expect(ultrasecretLocked("basic")).toBe(true);
    expect(ultrasecretLocked("full")).toBe(false);
  });
});
