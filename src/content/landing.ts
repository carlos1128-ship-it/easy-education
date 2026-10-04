/**
 * Todo o texto da landing (e os preços, quando forem aprovados) fica aqui.
 * Copiado de Landing.dc.html (versão aprovada, título "a").
 *
 * Itens marcados como TODO estão desligados por decisão pendente:
 * - Planos: seção visível; botões levam ao cadastro até o pagamento existir; limites a preencher.
 * - Avaliações: só com depoimentos reais e autorizados.
 * - E-mail de contato: falta o endereço real.
 * - Termos de uso e Privacidade: as rotas ainda não existem.
 */

export const landingLinks = {
  signUp: "/cadastro", // TODO: o app ainda não cobra; "Assinar" leva ao cadastro existente.
  login: "/login",
} as const;

export const landingNav = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Perguntas", href: "#perguntas" },
] as const;

export const landingHeader = {
  cta: "Assinar",
  login: "Entrar",
  openMenu: "Abrir menu",
  closeMenu: "Fechar menu",
} as const;

export const landingHero = {
  title: "Estude com mais foco e menos tempo perdido",
  subtitle:
    "Envie sua apostila e receba quizzes, flashcards e correção de redação na hora. Você descobre o que revisar antes da prova, não depois.",
  boxText: "Quiz, flashcards e redação em um só lugar",
  cta: "Assinar agora",
  highlights: ["Revisão espaçada (SM-2)", "Correção estilo ENEM", "Estude com seu PDF"],
  image: {
    src: "/images/estudante-jeans.webp",
    width: 792,
    height: 1240,
    alt: "Estudante de óculos e mochila, sorrindo e segurando cadernos",
  },
  floatingCard: { title: "12 flashcards para revisar hoje", note: "Exemplo ilustrativo" },
} as const;

export const landingFeatureStrip = [
  "Revisão espaçada com algoritmo SM-2",
  "Correção de redação estilo ENEM",
  "Envie seu PDF e estude com ele",
] as const;

export const landingProblem = {
  eyebrow: "O problema",
  title: "Tanto material, pouco tempo",
  text: "Apostila, resumo, lista, vídeo salvo. Conteúdo não falta. Falta saber por onde começar.",
  points: [
    "Você relê o capítulo inteiro para achar o que esqueceu.",
    "A dúvida só aparece na hora da prova.",
    "A redação volta corrigida uma semana depois, quando o tema já passou.",
  ],
  image: {
    src: "/images/estudantes-casal.webp",
    width: 1281,
    height: 1199,
    alt: "Estudante carregando uma pilha de livros ao lado de uma estudante concentrada num livro aberto",
  },
} as const;

export const landingSolution = {
  eyebrow: "Com o Easy Education",
  title: "Você abre o app e já sabe o que estudar",
  text: "Seu material vira prática. A revisão do dia já vem pronta, e cada erro vem explicado.",
  points: [
    "Quiz gerado da sua apostila, com explicação em cada alternativa.",
    "Flashcards do dia escolhidos pela revisão espaçada.",
    "Redação com nota e comentário por competência na hora.",
  ],
  image: {
    src: "/images/estudante-laptop.webp",
    width: 1792,
    height: 1336,
    alt: "Estudante sorrindo enquanto usa um notebook",
  },
  chat: {
    title: "Chat com IA",
    question: "Por que errei a questão 4?",
    answer: "Você marcou o Golgi, que modifica proteínas. O ATP sai da mitocôndria, na respiração celular.",
  },
} as const;

export const illustrativeLabel = "Exemplo ilustrativo";

export const landingResources = {
  eyebrow: "Recursos",
  title: "Uma ferramenta para cada parte do estudo",
  text: "Pratique, revise e escreva no mesmo lugar. Tudo vai para o seu painel.",
  quiz: {
    tag: "Quizzes",
    title: "Sua apostila vira questões",
    text: "Envie o PDF ou escolha a matéria. Cada alternativa tem explicação: você entende o erro na hora.",
    link: "Gerar um quiz",
    mock: {
      title: "Novo quiz",
      fileName: "Química orgânica — cap. 2.pdf",
      fileMeta: "34 páginas · enviado agora",
      fileSentLabel: "Enviado",
      questionsLabel: "Questões",
      questionsValue: "10",
      difficultyLabel: "Dificuldade",
      difficultyValue: "Média",
      topics: [
        { label: "Funções orgânicas", selected: true },
        { label: "Isomeria", selected: false },
        { label: "Reações", selected: false },
      ],
      button: "Gerar quiz",
    },
  },
  flashcards: {
    tag: "Flashcards",
    title: "Revise só o que está quase esquecendo",
    text: "O algoritmo SM-2 decide quando cada cartão volta. O que você já sabe aparece menos. O que é difícil, mais vezes.",
    link: "Revisar flashcards",
    mock: {
      meta: "História · Cartão 3 de 12",
      question: "Em que ano foi assinada a Lei Áurea?",
      answer: "1888, pela princesa Isabel. Aboliu a escravidão no Brasil.",
      grades: [
        { label: "Errei", interval: "1 min", selected: false },
        { label: "Difícil", interval: "1 dia", selected: false },
        { label: "Bom", interval: "4 dias", selected: true },
        { label: "Fácil", interval: "9 dias", selected: false },
      ],
    },
  },
  essay: {
    tag: "Redação",
    title: "Redação corrigida na hora",
    text: "Nota de 0 a 1000 e um comentário por competência do ENEM. Você sabe o que reescrever na próxima.",
    button: "Corrigir redação",
    mock: {
      title: "Desafios da mobilidade urbana no Brasil",
      meta: "Enviada em 2 de out. · 29 linhas",
      score: "840",
      scoreOf: "de 1000",
      competencies: [
        { id: "C1", name: "Domínio da norma culta", score: 160 },
        { id: "C2", name: "Compreensão do tema", score: 200 },
        { id: "C3", name: "Seleção de argumentos", score: 120 },
        { id: "C4", name: "Coesão textual", score: 180 },
        { id: "C5", name: "Proposta de intervenção", score: 180 },
      ],
      warning: "C3: os dados do segundo parágrafo não se ligam à tese. Explique por que eles sustentam seu argumento.",
    },
  },
  cards: {
    simulado: {
      title: "Simulados",
      text: "Treine no tempo de prova e veja em que área você perdeu mais pontos.",
      mock: {
        name: "Simulado ENEM · Dia 2",
        timer: "2:41:18 restantes",
        progressLabel: "Questão 37 de 90",
        progress: 41,
        areas: [
          { name: "Ciências da Natureza", value: "37 de 45" },
          { name: "Matemática", value: "0 de 45" },
        ],
      },
    },
    chat: {
      title: "Chat com IA",
      text: "Pergunte sobre a questão que errou. A explicação vem passo a passo, no seu ritmo.",
      image: { src: "/images/robo-estudando-azul.jpg", alt: "Robô sentado num banco lendo um livro" },
      question: "Por que errei a de MRU?",
      answerPrefix: "Converta km/h para m/s antes:",
      formula: "Δs = v · t",
    },
    plan: {
      title: "Plano de estudos",
      text: "Diga quanto tempo você tem por dia. O plano mostra o que estudar em cada um.",
      image: { src: "/images/pilha-de-livros.jpg", alt: "Pessoa sentada sobre uma pilha de livros, lendo" },
      doneLabel: "Concluído",
      days: [
        { day: "Seg", subject: "Matemática", minutes: "40 min", done: true },
        { day: "Ter", subject: "Química", minutes: "30 min", done: true },
        { day: "Qua", subject: "Redação", minutes: "50 min", done: false },
      ],
    },
  },
} as const;

export const landingSteps = {
  eyebrow: "Como funciona",
  title: "Do material à prática em três passos",
  steps: [
    { n: 1, title: "Envie seu material ou escolha a matéria", text: "Um PDF da escola, um resumo seu ou um assunto da lista." },
    { n: 2, title: "A IA gera quiz, simulado ou plano", text: "Questões, cartões e cronograma prontos a partir do que você enviou." },
    { n: 3, title: "Pratique e acompanhe seu desempenho", text: "Cada resposta mostra o que você já domina e o que revisar." },
  ],
} as const;

/**
 * Seção "Planos" (copiada do design). Os botões levam ao cadastro.
 * TODO: ligar ao pagamento (Stripe) quando a cobrança existir.
 * TODO: preencher os números de cada limite (`value`); no design estavam como "[X]".
 * TODO: os recursos exclusivos do Completo estavam como marcadores no design; incluir quando definidos.
 */
export const landingPlans = {
  enabled: true,
  eyebrow: "Planos",
  title: "Escolha o plano que cabe na sua rotina",
  text: "O Completo tem limites maiores de IA e recursos que o Básico não inclui.",
  basic: { name: "Básico", description: "Para praticar com IA em ritmo mais leve.", price: "R$ 26,90", period: "por mês" },
  full: { name: "Completo", description: "Para quem usa a IA todo dia.", price: "R$ 46,90", period: "por mês", badge: "Mais indicado" },
  limits: [
    { label: "Quizzes por mês", value: null as string | null },
    { label: "Correções de redação por mês", value: null as string | null },
    { label: "Mensagens no chat com IA por dia", value: null as string | null },
  ],
  fullExtra: "Limites maiores de IA que o Básico",
  cta: "Assinar plano",
  guarantee: "Garantia de 7 dias. Cancele quando quiser.",
  images: [
    { src: "/images/estudante-xadrez.webp", width: 686, height: 1290, alt: "Estudante sorrindo, segurando cadernos" },
    { src: "/images/estudante-jeans.webp", width: 792, height: 1240, alt: "Estudante de mochila sorrindo, segurando cadernos" },
  ],
} as const;

export const landingPerformance = {
  eyebrow: "Desempenho",
  title: "Veja o que você domina e o que precisa revisar",
  text: "Cada resposta entra no painel. A matéria que caiu vai para o topo da revisão.",
  card: {
    title: "Últimas 6 semanas",
    stats: [
      { label: "Taxa de acerto", value: "72%", delta: "+14 pts" },
      { label: "Questões respondidas", value: "486" },
      { label: "Flashcards em dia", value: "94%" },
    ],
    chartTitle: "Acerto por semana",
    legendHit: "Acerto",
    legendGoal: "Meta 75%",
    goal: 75,
    weeks: [58, 61, 63, 66, 69, 72],
    bySubjectTitle: "Por matéria",
    reviewLabel: "Revisar",
    subjects: [
      { name: "Matemática", value: 81, review: false },
      { name: "Biologia", value: 74, review: false },
      { name: "Química", value: 63, review: true },
      { name: "História", value: 58, review: true },
    ],
  },
  phone: {
    title: "Desempenho",
    badge: "Exemplo",
    weekLabel: "Acerto esta semana",
    weekValue: "72%",
    reviewTitle: "Revisar hoje",
    items: [
      { name: "Química · Isomeria", value: "63%" },
      { name: "História · Era Vargas", value: "58%" },
    ],
    button: "Começar revisão",
  },
} as const;

/** TODO: seção "Avaliações" desligada até haver depoimentos reais, com autorização. */
export const landingTestimonials = {
  enabled: false,
  eyebrow: "Avaliações",
  title: "O que os alunos dizem",
} as const;

export const landingFaq = {
  eyebrow: "Perguntas",
  title: "Perguntas frequentes",
  // TODO: "Não achou sua dúvida? Escreva para [e-mail de contato real]." volta quando houver o e-mail real.
  contactLine: null as string | null,
  items: [
    {
      q: "Quanto custa o Easy Education?",
      a: "Os planos começam em R$ 26,90 por mês. Você cancela quando quiser e tem 7 dias de garantia.",
    },
    {
      q: "Qual a diferença entre o Básico e o Completo?",
      a: "O Completo tem limites maiores de quizzes, correções e mensagens no chat, além de recursos que o Básico não inclui. Os limites estão na seção de planos.",
    },
    {
      q: "Serve para ENEM, vestibular e concursos?",
      a: "Sim. Você escolhe a matéria ou envia o próprio material, então as questões seguem o que você está estudando.",
    },
    {
      q: "A correção de redação substitui um professor?",
      a: "Não. Ela avalia as cinco competências do ENEM e aponta o que melhorar. A leitura de um professor continua valendo.",
    },
    {
      q: "Como funciona a revisão espaçada?",
      a: "Depois de cada flashcard, você diz se foi fácil ou difícil. O algoritmo SM-2 calcula quando ele volta.",
    },
    {
      q: "Dá para estudar pelo celular?",
      a: "Sim. A plataforma foi pensada para o celular e funciona direto no navegador.",
    },
  ],
} as const;

export const landingFinalCta = {
  title: "Comece hoje a estudar com mais foco",
  text: "Assine, envie sua apostila e comece a revisar pelo que mais importa.",
  cta: "Assinar agora",
  image: { src: "/images/formatura-azul.jpg" },
} as const;

export const landingFooter = {
  copyright: "© 2026 Easy Education. Todos os direitos reservados.",
  // TODO: "Termos de uso" e "Privacidade" voltam quando as rotas existirem.
  // TODO: "Contato: [e-mail de contato real]" volta quando houver o e-mail real.
} as const;
