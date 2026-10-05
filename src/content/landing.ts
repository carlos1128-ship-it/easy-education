/**
 * Todo o texto da landing (e os preços, quando forem aprovados) fica aqui.
 * Copiado de Landing.dc.html (versão aprovada, título "a").
 *
 * Itens marcados como TODO estão desligados por decisão pendente:
 * - Planos: seção visível; botões levam ao cadastro até o pagamento existir; números dos limites a preencher.
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
  loginHint: "Já é assinante?",
  openMenu: "Abrir menu",
  closeMenu: "Fechar menu",
} as const;

export const landingHero = {
  title: "Transforme qualquer material de estudo em treino",
  // Trecho do título destacado em azul
  titleKeyword: "treino",
  subtitle:
    "Mande o PDF, a foto do caderno ou só o nome da matéria. Em minutos você tem quiz com explicação em cada alternativa, flashcards que voltam no dia certo e um plano para cada dia de estudo.",
  boxText: "A partir de R$ 26,90/mês · 7 dias de garantia",
  cta: "Criar meu plano",
  highlights: ["Escola, faculdade, vestibular e concurso", "Questões com explicação", "PDF ou foto da matéria"],
  image: {
    src: "/images/estudante-jeans-recorte.webp",
    width: 792,
    height: 1240,
    alt: "Estudante de óculos e mochila, sorrindo e segurando cadernos",
  },
  floatingCard: { title: "12 flashcards para revisar hoje", note: "Exemplo ilustrativo" },
} as const;

export const landingFeatureStrip = [
  "Flashcards voltam pouco antes de você esquecer",
  "Envie a foto da redação escrita à mão",
  "Clique em Iniciar e a atividade do dia abre pronta",
] as const;

export const landingProblem = {
  eyebrow: "O problema",
  title: "Muito material, pouco tempo até a prova",
  text: "Apostila, resumo, lista, vídeo salvo. Conteúdo não falta. Falta saber por onde começar.",
  points: [
    "Você relê o capítulo inteiro para achar o que esqueceu.",
    "A dúvida só aparece na hora da prova.",
    "A redação volta corrigida uma semana depois, quando o tema já passou.",
  ],
  image: {
    src: "/images/estudantes-casal-recorte.webp",
    width: 1281,
    height: 1199,
    alt: "Estudante carregando uma pilha de livros ao lado de uma estudante concentrada num livro aberto",
  },
} as const;

export const landingSolution = {
  eyebrow: "Com o Easy Education",
  title: "Você abre o app e já sabe o que estudar",
  // Trecho do título em peso Black; o resto fica em Light
  titleStrong: "já sabe o que estudar",
  text: "Seu material vira prática. A revisão do dia já vem pronta, e cada erro vem explicado.",
  points: [
    "Quiz gerado da sua apostila, com explicação em cada alternativa.",
    "Flashcards do dia escolhidos pela revisão espaçada.",
    "Redação com nota e comentário por competência, digitada ou por foto.",
  ],
  image: {
    src: "/images/estudante-laptop-recorte.webp",
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

export const landingMeta = {
  title: "Easy Education: estude com IA usando o seu próprio material",
  description:
    "Envie PDF ou foto da matéria e receba quiz com explicação, flashcards com revisão espaçada, plano de estudos e correção de redação. Para escola, faculdade, vestibular e concurso. A partir de R$ 26,90 por mês.",
} as const;

export const landingResources = {
  eyebrow: "Recursos",
  title: "Pratique, revise e escreva no mesmo lugar",
  text: "Cada quiz, cartão e redação entra no seu painel e define o que você revisa depois.",
  quiz: {
    tag: "Quizzes",
    title: "Sua apostila vira questões",
    text: "Envie o PDF, uma foto ou só escolha a matéria. Cada alternativa tem explicação, então você entende o erro na hora em que erra.",
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
    text: "O app decide quando cada cartão volta. O que você já sabe aparece menos, e o que é difícil aparece mais vezes.",
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
    text: "Digite o texto ou fotografe a folha. A correção segue o modelo do ENEM: nota de 0 a 1000 e um comentário por competência, para você saber o que reescrever.",
    button: "Corrigir minha redação",
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
      text: "Treine no tempo de prova. Toda semana um simulado novo fica pronto no seu painel.",
      mock: {
        name: "Simulado da semana",
        timer: "1:12:40 restantes",
        progressLabel: "Questão 12 de 30",
        progress: 40,
        areas: [
          { name: "Biologia", value: "8 de 15" },
          { name: "Química", value: "4 de 15" },
        ],
      },
    },
    chat: {
      title: "Chat com IA",
      text: "Pergunte sobre a questão que errou ou peça “monta um simulado de matemática”. O chat cria e já te leva até ele.",
      image: { src: "/images/robo-estudando-azul.jpg", alt: "Robô sentado num banco lendo um livro" },
      question: "Por que errei a de MRU?",
      answerPrefix: "Converta km/h para m/s antes:",
      formula: "Δs = v · t",
    },
    plan: {
      title: "Plano de estudos",
      text: "Diga quanto tempo você tem por dia e o plano divide as matérias. Clique em Iniciar e o cronômetro liga.",
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
  title: "Do cadastro ao primeiro quiz em três passos",
  steps: [
    { n: 1, title: "Conte o que você estuda", text: "Escola, faculdade, vestibular ou concurso, a data da próxima prova e quantas horas por dia você tem. O plano da semana sai na hora." },
    { n: 2, title: "Mande seu material", text: "PDF da escola, foto do caderno ou só o nome da matéria. A IA monta quiz, flashcards e simulado." },
    { n: 3, title: "Pratique e veja sua evolução", text: "Cada resposta entra no painel e mostra o que você já domina e o que precisa revisar." },
  ],
} as const;

/**
 * Seção "Planos". Os botões levam ao cadastro até a cobrança (Stripe) existir.
 * Empacotamento: os dois planos têm todas as ferramentas; o Completo tem limites maiores de IA.
 * TODO: preencher os números de cada limite (`value`); linhas sem número não aparecem.
 */
export const landingPlans = {
  enabled: true,
  eyebrow: "Planos",
  title: "Escolha quanto de IA você quer usar",
  text: "Os dois planos têm todas as ferramentas. O Completo libera mais uso de IA para quem estuda todo dia.",
  basic: {
    name: "Básico",
    description: "Para estudar algumas vezes por semana.",
    price: "R$ 26,90",
    period: "por mês",
    perDay: "Menos de R$ 1 por dia",
    usage: "Limite padrão de uso da IA",
    cta: "Assinar o Básico",
  },
  full: {
    name: "Completo",
    description: "Para quem estuda todo dia e usa muito a IA.",
    price: "R$ 46,90",
    period: "por mês",
    perDay: "Cerca de R$ 1,56 por dia",
    usage: "Limite maior de uso da IA",
    cta: "Assinar o Completo",
    badge: "Mais indicado",
  },
  includedTitle: "Incluso nos dois planos",
  included: [
    "Quizzes e simulados com explicação",
    "Flashcards com revisão espaçada",
    "Correção de redação por texto ou foto",
    "Chat com IA e plano de estudos diário",
    "Painel de desempenho por matéria",
  ],
  limits: [
    { label: "quizzes por mês", basic: null as string | null, full: null as string | null },
    { label: "correções de redação por mês", basic: null as string | null, full: null as string | null },
    { label: "mensagens no chat por dia", basic: null as string | null, full: null as string | null },
  ],
  guarantee: "Garantia de 7 dias: se não gostar, devolvemos seu dinheiro. Cancele quando quiser.",
  images: [
    { src: "/images/estudante-xadrez-recorte.webp", width: 686, height: 1290, alt: "Estudante sorrindo, segurando cadernos" },
    { src: "/images/estudante-jeans-recorte.webp", width: 792, height: 1240, alt: "Estudante de mochila sorrindo, segurando cadernos" },
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
      a: "O Básico custa R$ 26,90 por mês e o Completo, R$ 46,90. Você cancela quando quiser e tem 7 dias de garantia.",
    },
    {
      q: "Qual a diferença entre o Básico e o Completo?",
      a: "Os dois têm todas as ferramentas. O Completo tem limites maiores de uso da IA, pensado para quem gera quizzes, corrige redações e conversa com o chat todo dia.",
    },
    {
      q: "Preciso ter a apostila em PDF?",
      a: "Não. Você pode mandar a foto da matéria ou só escolher o assunto. As questões seguem o que você está estudando.",
    },
    {
      q: "Posso mandar a redação escrita à mão?",
      a: "Pode. Tire uma foto da folha, confira o texto transcrito e peça a correção.",
    },
    {
      q: "Serve para escola, faculdade e concurso?",
      a: "Sim. As questões seguem o material que você envia ou o assunto que você escolhe, seja a prova do colégio, uma disciplina da faculdade, o vestibular ou o edital do concurso.",
    },
    {
      q: "A IA pode errar?",
      a: "Pode. Por isso cada questão traz a explicação e a correção da redação mostra o motivo de cada nota. Se algo não bater com o seu material, siga o material.",
    },
    {
      q: "A correção de redação substitui um professor?",
      a: "Não. Ela segue as cinco competências do modelo do ENEM e aponta o que melhorar. A leitura de um professor continua valendo.",
    },
    {
      q: "Como funciona a revisão espaçada?",
      a: "Depois de cada flashcard, você diz se foi fácil ou difícil. O algoritmo SM-2 calcula quando ele volta, pouco antes de você esquecer.",
    },
    {
      q: "Dá para estudar pelo celular?",
      a: "Sim. A plataforma foi pensada para o celular e funciona direto no navegador.",
    },
  ],
} as const;

export const landingFinalCta = {
  title: "Comece seu plano de estudos hoje",
  text: "Assine, conte o que você está estudando e receba o plano da semana na hora. Se não gostar, a garantia de 7 dias devolve seu dinheiro.",
  cta: "Criar meu plano",
  image: { src: "/images/formatura-azul.jpg" },
} as const;

export const landingFooter = {
  copyright: "© 2026 Easy Education. Todos os direitos reservados.",
  // TODO: "Termos de uso" e "Privacidade" voltam quando as rotas existirem.
  // TODO: "Contato: [e-mail de contato real]" volta quando houver o e-mail real.
} as const;
