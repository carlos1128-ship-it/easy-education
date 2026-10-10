/**
 * Textos dos Termos de Uso e da Política de Privacidade.
 * Rascunho escrito a partir do que o app faz de fato (conferido no código em 10/10/2026).
 * PRECISA de revisão de um advogado antes do lançamento com cobrança real (ver docs/plano-proxima-fase.md).
 */

export type LegalSection = { title: string; paragraphs: string[] };

export const termsSections: LegalSection[] = [
  {
    title: "1. O que é o Easy Education",
    paragraphs: [
      "O Easy Education é uma plataforma de estudos on-line. Ela transforma o material que você envia (PDF, foto, texto, vídeo do YouTube) ou o assunto que você escolhe em questões, flashcards, simulados, plano de estudos e correção de redação, com ajuda de inteligência artificial.",
      "Ao criar uma conta, você concorda com estes Termos e com a Política de Privacidade. Se não concordar, não use o serviço.",
    ],
  },
  {
    title: "2. Quem pode usar",
    paragraphs: [
      "O serviço é para pessoas a partir de 12 anos.",
      "Quem tem entre 12 e 17 anos só pode usar com o conhecimento e a autorização do pai, da mãe ou do responsável legal. A assinatura paga é contratada pelo responsável, que é o titular do meio de pagamento e responde por ela.",
      "Você é responsável pelas informações do cadastro e pela senha da sua conta. Não compartilhe o acesso.",
    ],
  },
  {
    title: "3. Planos, teste grátis e pagamento",
    paragraphs: [
      "Há dois planos pagos (Básico e Completo), com assinatura mensal. Não há plano gratuito. Os preços e o que cada plano inclui aparecem na página de planos antes da contratação.",
      "A primeira assinatura de cada pessoa começa com 7 dias grátis. Para começar o teste, você cadastra a forma de pagamento. Se não cancelar dentro desse prazo, a cobrança mensal começa no fim do teste e se renova a cada mês, até o cancelamento. Sem assinatura ou teste em vigor, o acesso ao app fica suspenso.",
      "O pagamento com cartão é processado pelo Stripe. O Easy Education não recebe nem guarda o número completo do seu cartão.",
      "Cada plano tem limites de uso dos recursos de IA, por dia ou por semana, e um teto de uso justo por mês. Os limites existem para manter o custo do serviço e evitar abuso. Quando um limite acaba, ele volta no período seguinte.",
    ],
  },
  {
    title: "4. Cancelamento, arrependimento e reembolso",
    paragraphs: [
      "Você pode cancelar a qualquer momento em Assinatura, sem multa. O acesso pago continua até o fim do período já pago.",
      "Garantia de 7 dias: nos 7 primeiros dias depois da primeira cobrança, você pode pedir o reembolso integral pelo botão na página Assinatura. O dinheiro volta para o mesmo cartão e a assinatura é encerrada na hora. Isso cobre o direito de arrependimento do Código de Defesa do Consumidor (art. 49).",
    ],
  },
  {
    title: "5. Inteligência artificial: o que esperar",
    paragraphs: [
      "As questões, os flashcards, as explicações, o plano e a correção de redação são gerados por IA. A IA pode errar. Por isso cada questão traz explicação e a redação mostra o motivo de cada nota. Se algo não bater com o seu material ou com o seu professor, siga o material e o professor.",
      "A nota de redação é uma estimativa no modelo do ENEM. Ela não é a nota oficial e não substitui a correção de um professor.",
      "Questões de provas anteriores do ENEM são do INEP e aparecem com a fonte. A resolução comentada é conteúdo do Easy Education, separado da questão original.",
    ],
  },
  {
    title: "6. O seu conteúdo",
    paragraphs: [
      "O material que você envia continua sendo seu. Você nos autoriza a guardá-lo e processá-lo apenas para prestar o serviço a você (gerar suas questões, flashcards e correções).",
      "Envie apenas material que você tem direito de usar para estudar. Não envie conteúdo ilegal, ofensivo ou dados pessoais de outras pessoas.",
      "Questões geradas por IA a partir de um assunto (não do seu material) podem ser reaproveitadas, sem identificação, para outros alunos que pedem o mesmo assunto. Questões geradas a partir do seu material não são compartilhadas.",
    ],
  },
  {
    title: "7. Uso proibido",
    paragraphs: [
      "Não é permitido: tentar burlar limites de uso, automatizar pedidos (robôs, scripts), revender o acesso, copiar o serviço, tentar acessar dados de outros alunos ou atacar a plataforma. Nesses casos, a conta pode ser suspensa.",
    ],
  },
  {
    title: "8. Disponibilidade e mudanças",
    paragraphs: [
      "Trabalhamos para manter o serviço no ar, mas ele pode ficar fora do ar por manutenção ou falha de fornecedores (como o provedor de IA).",
      "Podemos mudar estes Termos. Mudanças importantes são avisadas no app com antecedência. Se você continuar usando depois da mudança, ela passa a valer para você.",
    ],
  },
  {
    title: "9. Contato e foro",
    paragraphs: [
      "Dúvidas, reclamações e pedidos: use o contato indicado no fim desta página.",
      "Estes Termos seguem a lei brasileira. Fica eleito o foro do domicílio do consumidor.",
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    title: "1. Quem cuida dos seus dados",
    paragraphs: [
      "O controlador dos dados é o responsável pelo Easy Education indicado no fim desta página. Esta política explica quais dados coletamos, por que, com quem compartilhamos e como você exerce os seus direitos pela Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).",
    ],
  },
  {
    title: "2. Dados que coletamos",
    paragraphs: [
      "Cadastro: nome, e-mail e senha (a senha fica guardada de forma cifrada pelo provedor de login). Se você entrar com o Google, recebemos nome, e-mail e foto do perfil.",
      "Personalização: objetivo de estudo, série ou curso, prova, matérias, dificuldades, rotina e preferências que você informa no onboarding.",
      "Estudo: quizzes, simulados, respostas, flashcards, redações, anotações, resumos do dia, plano de estudos, tempo estudado e mensagens do chat.",
      "Arquivos: PDFs, fotos e links de vídeo que você envia, e o texto extraído deles.",
      "Pagamento: o Stripe processa o pagamento. Recebemos só o status da assinatura, o plano e as datas de cobrança. Não recebemos o número do cartão.",
      "Uso técnico: registros de uso dos recursos (para aplicar os limites do plano) e o custo de cada uso de IA. Não usamos ferramentas de anúncio nem rastreadores de terceiros no app.",
    ],
  },
  {
    title: "3. Para que usamos",
    paragraphs: [
      "Prestar o serviço que você contratou: gerar questões, flashcards, plano e correções, guardar seu histórico e mostrar seu desempenho (base legal: execução de contrato).",
      "Cobrar a assinatura e cumprir obrigações legais e fiscais (base legal: execução de contrato e obrigação legal).",
      "Segurança, prevenção de abuso e controle de custo dos limites (base legal: legítimo interesse).",
      "Não vendemos seus dados. Não usamos seus dados para publicidade.",
    ],
  },
  {
    title: "4. Inteligência artificial",
    paragraphs: [
      "Para gerar o seu conteúdo, o trecho necessário do seu material e do seu perfil de estudo é enviado ao provedor de IA (Google Gemini). Enviamos só dados de estudo: nunca o seu nome, e-mail ou documento.",
      "Usamos a API paga do Gemini, cujos termos dizem que o conteúdo enviado não é usado para treinar os modelos do Google.",
    ],
  },
  {
    title: "5. Com quem compartilhamos",
    paragraphs: [
      "Apenas com fornecedores necessários para o serviço funcionar, que tratam os dados em nosso nome: Supabase (login, banco de dados e arquivos), Vercel (hospedagem), Google (IA) e Stripe (pagamento).",
      "Alguns desses fornecedores guardam dados fora do Brasil. Nesses casos, a transferência segue as garantias do art. 33 da LGPD, com contratos que exigem proteção equivalente.",
      "Podemos compartilhar dados se uma autoridade exigir por lei ou ordem judicial.",
    ],
  },
  {
    title: "6. Crianças e adolescentes",
    paragraphs: [
      "O Easy Education é para pessoas a partir de 12 anos. Não aceitamos cadastro de crianças com menos de 12 anos.",
      "Para quem tem entre 12 e 17 anos, tratamos os dados no melhor interesse do adolescente (art. 14 da LGPD): coletamos só o necessário para o estudo, não usamos para publicidade e não compartilhamos com terceiros além dos fornecedores do item 5. O uso deve ter o conhecimento do responsável legal, que contrata a assinatura paga.",
      "O responsável pode pedir, a qualquer momento, acesso, correção ou exclusão dos dados do adolescente pelo contato desta página.",
    ],
  },
  {
    title: "7. Por quanto tempo guardamos",
    paragraphs: [
      "Enquanto sua conta existir. Se você pedir a exclusão, apagamos os dados da conta em até 30 dias, exceto o que a lei manda guardar (como registros de cobrança, pelo prazo fiscal).",
      "Registros de custo de IA ficam sem identificação depois da exclusão da conta.",
    ],
  },
  {
    title: "8. Seus direitos",
    paragraphs: [
      "Você pode pedir: confirmação de que tratamos seus dados, acesso, correção, exclusão, portabilidade, informação sobre com quem compartilhamos e revogação do consentimento, quando ele for a base legal (art. 18 da LGPD). Responderemos em até 15 dias.",
      "Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
    ],
  },
  {
    title: "9. Segurança",
    paragraphs: [
      "Cada aluno só acessa os próprios dados (regras de acesso no banco), os arquivos ficam em armazenamento privado e a comunicação é cifrada (HTTPS). Nenhum sistema é 100% seguro; se houver um incidente que traga risco a você, avisaremos você e a ANPD.",
    ],
  },
  {
    title: "10. Mudanças nesta política",
    paragraphs: [
      "Se a política mudar de forma importante, avisaremos no app antes. A data da versão atual está no topo da página.",
    ],
  },
];
