/**
 * Evidências sobre métodos de estudo. Cada afirmação segue o que a fonte permite dizer:
 * quem foi estudado, o que foi medido e o que NÃO dá para concluir.
 * Todos os números abaixo foram conferidos nas fontes (ver docs/evidencias.md).
 *
 * REGRAS (não quebrar):
 * - Nenhuma promessa de resultado sobre o NOSSO produto ("alunos subiram X pontos", "aumente sua nota em X%").
 * - Sem número que não tenha fonte. Se não achar fonte, escreve sem número.
 *
 * TODO(resultados-reais): quando houver dados medidos a partir dos simulados diagnósticos e dos seguintes
 * (bank_sessions, kind = "diagnostic" e "simulado"), acrescentar aqui um bloco "Resultados da Easy Education"
 * com o método, o número de alunos e a data. Enquanto não houver, a página diz que ainda não há.
 */

export type EvidenceReference = { citation: string; url: string };

export type EvidenceItem = {
  id: string;
  title: string;
  /** Frase curta para a landing. */
  summary: string;
  /** O que o estudo fez e encontrou, com os números da fonte. */
  details: string[];
  /** O que NÃO dá para concluir. */
  caveat: string;
  /** Como o app usa a ideia (sem prometer resultado). */
  inApp: string;
  reference: EvidenceReference;
};

export const evidenceItems: EvidenceItem[] = [
  {
    id: "pratica-de-recuperacao",
    title: "Testar-se ajuda a lembrar por mais tempo do que reler",
    summary:
      "Num experimento com 180 universitários, quem estudou um texto e fez três testes de memória lembrou 61% dele uma semana depois. Quem releu o texto quatro vezes lembrou 40%.",
    details: [
      "Participantes: 180 universitários de 18 a 24 anos (Washington University in St. Louis). Material: textos curtos de ciências, de cerca de 260 palavras.",
      "Três grupos: estudou o texto quatro vezes; estudou três vezes e fez um teste de memória; estudou uma vez e fez três testes de memória, sem receber o gabarito.",
      "Teste final cinco minutos depois: quem releu mais lembrou mais (83%, contra 78% e 71%).",
      "Teste final uma semana depois: o resultado se inverteu. Lembraram 61% (três testes), 56% (um teste) e 40% (reler quatro vezes).",
      "Quem se testou leu o texto cerca de 3,4 vezes no total. Quem releu leu cerca de 14,2 vezes.",
    ],
    caveat:
      "É um estudo de laboratório com textos curtos e universitários. Ele mostra que se testar ajuda a manter a lembrança por mais tempo. Não mede nota em prova e não mede o efeito de usar a Easy Education.",
    inApp: "O banco de questões, os quizzes e os flashcards pedem que você tente responder antes de ver a resposta.",
    reference: {
      citation: "Roediger, H. L., III, & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. Psychological Science, 17(3), 249–255.",
      url: "https://pubmed.ncbi.nlm.nih.gov/16507066/",
    },
  },
  {
    id: "repeticao-espacada",
    title: "O intervalo ideal entre as revisões cresce com o prazo da prova",
    summary:
      "Uma meta-análise de 317 experimentos sobre memória verbal concluiu que o melhor intervalo entre as sessões de estudo aumenta quanto mais tempo se precisa lembrar do conteúdo.",
    details: [
      "A revisão reuniu 839 comparações, de 317 experimentos publicados em 184 artigos, todos com tarefas de memória verbal.",
      "Os autores compararam estudar tudo junto com estudar em momentos separados, e testaram intervalos maiores e menores entre as sessões.",
      "Conclusão dos autores: o intervalo entre sessões e o tempo até o teste final atuam juntos. O intervalo que dá a melhor lembrança final cresce quando o teste final está mais distante.",
    ],
    caveat:
      "São tarefas de memória verbal, em geral de laboratório. O estudo não diz quantos dias exatos servem para cada aluno ou matéria. Os intervalos do app (volta amanhã, depois em 3 dias, depois cada vez mais longe) são uma aproximação razoável dessa ideia, não um calendário comprovado.",
    inApp: "As questões que você erra ou marca voltam em intervalos crescentes na Revisão, e os flashcards também.",
    reference: {
      citation: "Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. Psychological Bulletin, 132, 354–380.",
      url: "https://pubmed.ncbi.nlm.nih.gov/16719566/",
    },
  },
  {
    id: "tecnicas-de-estudo",
    title: "Quais técnicas de estudo têm mais apoio na pesquisa",
    summary:
      "Uma revisão de 10 técnicas de estudo deu a maior nota de utilidade a se testar (prática com testes) e a estudar espaçado. Reler, grifar e resumir ficaram entre as de baixa utilidade.",
    details: [
      "Dunlosky e colegas revisaram a pesquisa sobre 10 técnicas que estudantes costumam usar.",
      "Duas receberam a maior nota de utilidade: a prática com testes e a prática distribuída (estudar espaçado, em vez de tudo junto).",
      "Cinco ficaram na faixa de baixa utilidade, entre elas reler, grifar ou sublinhar e resumir.",
    ],
    caveat:
      "É uma revisão que avalia a força da evidência de cada técnica em geral. Não testou nenhum produto e não promete que a nota vai subir.",
    inApp: "Por isso o app prioriza questões, revisão espaçada e correção com devolutiva, e não só resumos e releitura.",
    reference: {
      citation: "Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology. Psychological Science in the Public Interest, 14(1), 4–58.",
      url: "https://doi.org/10.1177/1529100612453266",
    },
  },
  {
    id: "feedback-na-escrita",
    title: "Receber devolutiva sobre o texto melhora a escrita",
    summary:
      "Uma meta-análise com alunos do 1º ao 8º ano encontrou que feedback sobre a escrita melhorou a qualidade dos textos. O efeito foi menor quando o feedback veio de computador do que de adultos.",
    details: [
      "A meta-análise reuniu experimentos feitos com alunos do 1º ao 8º ano e mediu a qualidade dos textos.",
      "Feedback sobre a escrita melhorou a qualidade dos textos. Os tamanhos de efeito médios foram 0,87 (feedback de adultos), 0,58 (de colegas), 0,62 (do próprio aluno) e 0,38 (de computadores). Quanto maior o número, maior a melhora.",
    ],
    caveat:
      "Os estudos são com alunos do ensino fundamental, não de vestibular ou ENEM, e não medem pontos de nota. Não encontramos fonte confiável que sustente um número como \"uma redação por semana aumenta a nota em X%\", então não usamos nenhum. O feedback de computador teve o menor efeito: por isso a correção por IA serve para treinar e entender o que melhorar, e não substitui a leitura de um professor.",
    inApp: "A correção de redação mostra a nota de cada competência e o que melhorar, para você reescrever.",
    reference: {
      citation: "Graham, S., Hebert, M., & Harris, K. R. (2015). Formative assessment and writing: A meta-analysis. The Elementary School Journal, 115(4), 523–547.",
      url: "https://acuresearchbank.acu.edu.au/item/86vq0/formative-assessment-and-writing-a-meta-analysis",
    },
  },
];

export const evidenceDisclaimer =
  "Estes estudos mostram o que a pesquisa encontrou sobre estratégias de estudo em geral. Eles não são resultados medidos com alunos da Easy Education. Ainda não temos esses resultados e, quando tivermos, vamos publicá-los aqui com o método usado.";

export const evidenceNotes = [
  "Pomodoro: o cronômetro de foco do app é uma ferramenta opcional. A evidência científica sobre ele é fraca, então não usamos como argumento e não prometemos resultado.",
  "Nota estimada dos simulados: é uma estimativa baseada no seu percentual de acerto, não a nota TRI do INEP.",
] as const;
