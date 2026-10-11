import { describe, expect, it } from "vitest";
import { normalizeBluexQuestion, placeImages, reflowPdfText, stripOptionLetter } from "@/lib/bank/vestibular";

describe("reflowPdfText", () => {
  it("junta as linhas quebradas do PDF sem trocar palavras", () => {
    expect(reflowPdfText("Um  fabricante de acessórios de montanhismo quer projetar um\ncolchão de espuma apropriado para ser utilizado por alpinistas\nem regiões frias.")).toBe(
      "Um fabricante de acessórios de montanhismo quer projetar um colchão de espuma apropriado para ser utilizado por alpinistas em regiões frias.",
    );
  });

  it("mantém parágrafos separados por linha em branco", () => {
    expect(reflowPdfText("Primeiro.\n \nSegundo\nparágrafo.")).toBe("Primeiro.\n\nSegundo parágrafo.");
  });

  it("mantém a quebra dos versos", () => {
    expect(reflowPdfText("Minha terra tem palmeiras\nOnde canta o sabiá\nAs aves que aqui gorjeiam\nNão gorjeiam como lá")).toContain("palmeiras\nOnde canta");
  });

  it("junta o hífen do fim da linha sem espaço", () => {
    expect(reflowPdfText("depois de bem aradas, ponham-\nnas a cozer em fogo brando por muito tempo")).toBe("depois de bem aradas, ponham-nas a cozer em fogo brando por muito tempo");
  });
});

describe("normalizeBluexQuestion", () => {
  const url = (index: number) => `https://cdn.example.com/${index}.jpg`;
  const base = {
    question: "Um texto de apoio\ncom quebra.\n\n[IMAGE 0]\n\nQual é a resposta?",
    number: 3,
    id: "USP_2023_3",
    alternatives: ["a) um", "b) dois", "c) três", "d) quatro", "e) cinco"],
    associated_images: ["imgs/USP/2023/3/0.jpg"],
    answer: "C",
    alternatives_type: "string",
    subject: ["physics"],
  };

  it("separa apoio e pergunta, coloca a imagem e tira a letra das alternativas", () => {
    const result = normalizeBluexQuestion(base, url);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.question.statement).toBe("Qual é a resposta?");
    expect(result.question.supportText).toContain("![Figura da questão](https://cdn.example.com/0.jpg)");
    expect(result.question.options.map((option) => option.text)).toEqual(["um", "dois", "três", "quatro", "cinco"]);
    expect(result.question.year).toBe(2023);
    expect(result.question.area).toBe("ciencias-natureza");
    expect(result.subjectSlug).toBe("fisica");
  });

  it("aceita prova de 4 alternativas (UNICAMP) e alternativas em imagem", () => {
    const result = normalizeBluexQuestion({ ...base, id: "UNICAMP_2019_63", alternatives: ["a)[IMAGE 0]", "b) dois", "c) três", "d) quatro"], answer: "A" }, url);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.question.options[0]).toEqual({ label: "A", text: "", imageUrl: "https://cdn.example.com/0.jpg" });
  });

  it("recusa questão anulada ou incompleta", () => {
    expect(normalizeBluexQuestion({ ...base, answer: null }, url).ok).toBe(false);
    expect(normalizeBluexQuestion({ ...base, alternatives: [] }, url).ok).toBe(false);
    expect(normalizeBluexQuestion({ ...base, question: "Veja [IMAGE 4]" }, url).ok).toBe(false);
  });

  it("helpers", () => {
    expect(stripOptionLetter("d)  na disposição")).toBe("na disposição");
    expect(placeImages("antes [IMAGE 0] depois", ["https://x/0.jpg"])).toBe("antes\n\n![Figura da questão](https://x/0.jpg)\n\ndepois");
  });
});
