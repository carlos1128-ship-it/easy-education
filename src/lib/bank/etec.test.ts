import { describe, expect, it } from "vitest";
import { etecQuestionCount, parseEtecAnswerKey, parseKeyVersions } from "@/lib/bank/etec";
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

describe("gabarito com várias versões", () => {
  it("tabela com uma coluna por versão (FUVEST 2025)", () => {
    const rows = Array.from({ length: 25 }, (_, index) => `${index + 1} \tE \t${index + 46} \tD \t${index + 1} \tA \t${index + 46} \tC`);
    const text = `PROVA V1 PROVA V2\n${rows.join("\n")}`;
    const versions = parseKeyVersions(text);
    expect(versions).toHaveLength(2);
    expect(versions[0].get(1)).toBe("E");
    expect(versions[0].get(46)).toBe("D");
    expect(versions[1].get(1)).toBe("A");
  });

  it("letra da prova na frente de cada par (FUVEST 2011-2017)", () => {
    const rows = Array.from({ length: 45 }, (_, index) => `V ${String(index + 1).padStart(2, "0")}-B K ${String(index + 1).padStart(2, "0")}‐ E`).join("\n");
    const versions = parseKeyVersions(rows);
    expect(versions).toHaveLength(2);
    expect(versions[0].get(10)).toBe("B");
    expect(versions[1].get(10)).toBe("E");
  });

  it("blocos Versão N (UNESP)", () => {
    // 3 linhas de 10, como na folha da Vunesp.
    const lines = Array.from({ length: 3 }, (_, row) => Array.from({ length: 10 }, (_, column) => `${row * 10 + column + 1} - ${"ABCDE"[(row * 10 + column) % 5]}`).join(" \t"));
    const versions = parseKeyVersions(`Versão 1\n${lines.join("\n")}`);
    expect(versions).toHaveLength(1);
    expect(versions[0].get(7)).toBe("B");
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
