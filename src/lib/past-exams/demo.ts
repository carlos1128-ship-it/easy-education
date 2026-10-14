import { itemSchema, type ExamItemData } from "./domain";
export const DEMO_ID = "d5e80833-e0b1-41a8-b3f9-c371560ee301";
export const DEMO_QUESTIONS = [
  {
    number: 1,
    format: "mcq5",
    subject: "Matemática",
    page: 1,
    prompt:
      "Uma biblioteca recebeu 120 livros. Um quarto deles e de literatura. Quantos livros de literatura foram recebidos?",
    choices: ["A) 20", "B) 30", "C) 40", "D) 60", "E) 90"],
    correct: "B",
    explanation:
      "Um quarto equivale a dividir por 4. Assim, 120 / 4 = 30 livros de literatura. 60 corresponderia à metade, e 90 aos três quartos.",
  },
  {
    number: 2,
    format: "mcq4",
    subject: "Física",
    page: 1,
    prompt:
      "Um ciclista percorre 600 metros em 120 segundos, com velocidade constante. Qual e sua velocidade?",
    choices: ["A) 2 m/s", "B) 3 m/s", "C) 5 m/s", "D) 12 m/s"],
    correct: "C",
    explanation:
      "A velocidade é a distância dividida pelo intervalo de tempo: v = 600 m / 120 s = 5 m/s. As unidades já estão no Sistema Internacional; não é preciso converter para quilômetros por hora.",
  },
  {
    number: 3,
    format: "boolean",
    subject: "Biologia",
    page: 1,
    prompt:
      "Julgue: a fotossintese transforma energia luminosa em energia quimica armazenada em moleculas organicas.",
    choices: ["C) Certo", "E) Errado"],
    correct: "C",
    explanation:
      "A afirmação é correta. Organismos fotossintetizantes captam energia luminosa e a utilizam para produzir moléculas orgânicas. A energia passa a ser armazenada nas ligações químicas dessas moléculas.",
  },
  {
    number: 4,
    format: "written",
    subject: "Matemática",
    page: 2,
    prompt:
      "Explique por que multiplicar um preco por 0,8 equivale a aplicar um desconto de 20%.",
    choices: [],
    correct:
      "Depois de retirar 20% do preço, restam 80%. Como 80/100 = 0,8, o preço com desconto é o preço original multiplicado por 0,8.",
    explanation:
      "Considere um preço P. O desconto é 0,2P. O valor restante é P - 0,2P = 0,8P. Uma resposta adequada deve relacionar a parte restante (80%) ao fator decimal 0,8. Esta questão não recebe nota automática.",
  },
  {
    number: 5,
    format: "mcq5",
    subject: "Matemática",
    page: 2,
    prompt:
      "Ao lancar um dado equilibrado de seis faces numeradas de 1 a 6, qual e a probabilidade de obter um numero maior que 4?",
    choices: ["A) 1/6", "B) 1/2", "C) 2/3", "D) 1/3", "E) 5/6"],
    correct: "D",
    explanation:
      "Há seis resultados equiprováveis e apenas dois favoráveis: 5 e 6. Portanto, a probabilidade é 2/6 = 1/3. O número 4 não é favorável, pois o enunciado pede um número estritamente maior que 4.",
  },
  {
    number: 6,
    format: "mcq4",
    subject: "Conhecimentos gerais",
    page: 2,
    prompt:
      "Item de demonstracao anulado. Este item foi incluido apenas para testar a sinalizacao de anulacao no resultado.",
    choices: [
      "A) Primeira alternativa",
      "B) Segunda alternativa",
      "C) Terceira alternativa",
      "D) Quarta alternativa",
    ],
    correct: "",
    annulled: true,
    explanation:
      "Item anulado no exemplo autoral; não entra no percentual de acertos.",
  },
] as const;
export function demoItems(sourceUrl: string): ExamItemData[] {
  return DEMO_QUESTIONS.map((q) =>
    itemSchema.parse({
      ...q,
      sourceUrl,
      explanationReviewed: true,
      regions: [{ page: q.page, x: 0, y: 0, width: 1, height: 1 }],
    }),
  );
}
