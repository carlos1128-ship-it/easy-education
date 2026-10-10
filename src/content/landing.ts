/**
 * Todo o texto da landing (e os preços, quando forem aprovados) fica aqui.
 * Copiado de Landing.dc.html (versão aprovada, título "a").
 *
 * Itens marcados como TODO estão desligados por decisão pendente:
 * - Planos: seção visível; botões levam ao cadastro com o plano escolhido e dali ao pagamento; números dos limites a preencher.
 * - Avaliações: só com depoimentos reais e autorizados.
 * - E-mail de contato: falta o endereço real.
 * - Termos de uso e Privacidade: as rotas ainda não existem.
 */

import { PLANS, formatPriceBRL } from "@/lib/plans";

/** Preços sempre vêm de src/lib/plans.ts: nenhum valor em reais é escrito à mão na landing. */
const priceBasic = formatPriceBRL(PLANS.basic.priceCents);
const priceFull = formatPriceBRL(PLANS.full.priceCents);

export const landingLinks = {
  signUp: "/cadastro", // Cadastro grátis -> onboarding. Com ?plano=, segue para o pagamento no Stripe.
  signUpBasic: "/cadastro?plano=basico",
  signUpFull: "/cadastro?plano=completo",
  login: "/login",
} as const;

export const landingNav = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "Perguntas", href: "#perguntas" },
] as const;

export const landingHeader = {
  cta: "Começar grátis",
  login: "Entrar",
  loginHint: "Já tem conta?",
  openMenu: "Abrir menu",
  closeMenu: "Fechar menu",
} as const;

export const landingHero = {
  title: "Transforme qualquer material de estudo em treino",
  // Trecho do título destacado em azul
  titleKeyword: "treino",
  subtitle:
    "Mande o PDF, a foto do caderno ou só o nome da matéria. Em minutos você tem quiz com explicação em cada alternativa, flashcards que voltam no dia certo e um plano para cada dia de estudo.",
  boxText: `7 dias grátis · planos a partir de ${priceBasic}/mês`,
  cta: "Começar grátis",
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
    `Envie PDF ou foto da matéria e receba quiz com explicação, flashcards com revisão espaçada, plano de estudos, simulados e correção de redação. Para escola, faculdade, vestibular e concurso. Teste 7 dias grátis; planos a partir de ${priceBasic} por mês.`,
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
      // Os mesmos três botões do app, com os prazos de um cartão já revisado (intervalo 3 dias; ver flashcards/[id]/review).
      grades: [
        { label: "Não sabia", interval: "1 dia", selected: false },
        { label: "Mais ou menos", interval: "4 dias", selected: false },
        { label: "Sabia bem", interval: "8 dias", selected: true },
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
      text: "Quem estuda para o ENEM faz provas anteriores de 90 questões, com cronômetro no tempo da prova. Quem estuda para concurso recebe simulados do seu concurso, no estilo da banca.",
      // Espelha o simulado de provas anteriores do ENEM (1º dia: 90 questões, 5h30 de prova, cronômetro regressivo).
      mock: {
        name: "ENEM · 1º dia",
        timer: "4:48:10 restantes",
        progressLabel: "Questão 12 de 90",
        progress: 13,
        areas: [
          { name: "Linguagens", value: "8 de 10" },
          { name: "Ciências Humanas", value: "1 de 2" },
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
 * Seção "Planos". Cada botão leva ao cadastro já com o plano escolhido e dali ao pagamento (Stripe).
 * Empacotamento: os dois planos têm todas as ferramentas; o Completo tem limites maiores de IA.
 * TODO: preencher os números de cada limite (`value`); linhas sem número não aparecem.
 */
export const landingPlans = {
  enabled: true,
  eyebrow: "Planos",
  title: "Teste 7 dias grátis e escolha quanto de IA você quer usar",
  text: "Os dois planos começam com 7 dias grátis. Você cadastra o cartão, usa tudo por 7 dias e só paga se continuar. Cancele antes e não paga nada.",
  basic: {
    name: PLANS.basic.name,
    description: "Para estudar com IA algumas vezes por semana.",
    price: priceBasic,
    period: "por mês",
    cta: "Testar 7 dias grátis",
  },
  full: {
    name: PLANS.full.name,
    description: "Para quem estuda todo dia e usa muito a IA.",
    price: priceFull,
    period: "por mês",
    cta: "Testar 7 dias grátis",
    badge: "Mais indicado",
  },
  includedTitle: "Nos dois planos",
  included: [
    "Chat com IA, quizzes, flashcards e simulados com IA",
    "Correção de redação, também por foto",
    "Plano de estudos com roteiro, trilha e troféus",
    "Simulados com provas anteriores do ENEM e desempenho",
  ],
  guarantee: "7 dias grátis para testar e, depois do primeiro pagamento, mais 7 dias de garantia. Cancele quando quiser.",
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

/**
 * Avaliações. Só entra depoimento REAL e autorizado, copiado exatamente como foi escrito (sem melhorar o texto).
 * A seção só aparece quando `items` tiver pelo menos um item. Para preencher, acrescente em `items`:
 *   { name: "Nome como aparece na avaliação", text: "Texto exato", photo: "/images/avaliacoes/arquivo.webp" (opcional), source: "De onde veio (opcional)" }
 * Se a avaliação for de uma versão antiga do produto, deixe isso claro em `source`.
 */
export type Testimonial = { name: string; text: string; photo?: string; source?: string };

export const landingTestimonials: { eyebrow: string; title: string; items: Testimonial[] } = {
  eyebrow: "Avaliações",
  title: "O que os alunos dizem",
  items: [],
};

export const landingFaq = {
  eyebrow: "Perguntas",
  title: "Perguntas frequentes",
  // TODO: "Não achou sua dúvida? Escreva para [e-mail de contato real]." volta quando houver o e-mail real.
  contactLine: null as string | null,
  items: [
    {
      q: "Preciso pagar para usar?",
      a: "Os 7 primeiros dias são grátis. O cartão é pedido no início, mas a primeira cobrança só acontece no fim do teste, e você pode cancelar antes sem pagar nada. Depois do teste, o plano é pago.",
    },
    {
      q: "Como funcionam os limites de uso?",
      a: "Cada plano pago tem um uso justo de IA, maior no Completo. Você acompanha quanto já usou em Assinatura, dentro do app. O uso do dia volta à meia-noite e o da semana, na segunda-feira.",
    },
    {
      q: "Como funcionam os simulados?",
      a: "Quem estuda para o ENEM faz provas anteriores com as questões oficiais do INEP: o 1º dia, o 2º dia (90 questões cada) ou a prova completa, com cronômetro e gabarito oficial. Quem estuda para concurso recebe, nos planos pagos, simulados no estilo da banca, gerado por IA e marcado como \"Gerado por IA\". No fim de cada simulado você vê quanto acertou por área e por matéria.",
    },
    {
      q: "A nota estimada do simulado é a nota do ENEM?",
      a: "Não. É uma estimativa baseada no seu percentual de acerto, numa escala de 300 a 900 por área, sem usar a Teoria de Resposta ao Item (TRI) do INEP. A nota real pode ser bem diferente. Use como ordem de grandeza e para acompanhar sua evolução.",
    },
    {
      q: "Como cancelo?",
      a: "Em Assinatura, dentro do app, você abre o portal do Stripe, cancela quando quiser e continua usando até o fim do período pago. Nos primeiros 7 dias após o primeiro pagamento, você também pode pedir o dinheiro de volta.",
    },
    {
      q: "Quais formas de pagamento?",
      a: "O pagamento dos planos pagos é feito pelo Stripe, com cartão. Pix e boleto não estão disponíveis para assinatura por enquanto.",
    },
    {
      q: "Quanto custa o Easy Education?",
      a: `O Básico custa ${priceBasic} por mês e o Completo, ${priceFull}, os dois com 7 dias grátis para testar. Você cancela quando quiser e, depois do primeiro pagamento, tem mais 7 dias de garantia.`,
    },
    {
      q: "Qual a diferença entre o Básico e o Completo?",
      a: "Os dois têm todos os recursos: chat com IA, correção de redação, quizzes, flashcards e simulados gerados por IA, vídeos do YouTube, plano de estudos e trilha. O Completo tem o maior uso de IA do app e a IA mais avançada na redação e no plano. A tabela de planos compara cada recurso.",
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
      a: "Depois de cada flashcard, você diz se não sabia, se foi mais ou menos ou se sabia bem. O app calcula quando ele volta: o que você erra volta no dia seguinte e o que você sabe demora cada vez mais para voltar.",
    },
    {
      q: "Dá para estudar pelo celular?",
      a: "Sim. A plataforma foi pensada para o celular e funciona direto no navegador.",
    },
  ],
} as const;

export const landingFinalCta = {
  title: "Comece seu plano de estudos hoje",
  text: "Crie sua conta, conte o que você está estudando e receba o plano da semana na hora. Os planos pagos começam com 7 dias grátis.",
  cta: "Começar grátis",
  image: { src: "/images/formatura-azul.jpg" },
} as const;

export const landingFooter = {
  copyright: "© 2026 Easy Education. Todos os direitos reservados.",
  // Links legais e e-mail de contato vêm de src/lib/site.ts (e-mail: NEXT_PUBLIC_SUPPORT_EMAIL).
} as const;
