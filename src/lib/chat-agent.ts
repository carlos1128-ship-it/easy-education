import { revalidatePath } from "next/cache";
import { Type, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";
import { createFlashcardDeckForUser } from "@/lib/flashcard-generation";
import { getPrisma } from "@/lib/prisma";
import { createQuizForUser } from "@/lib/quiz-generation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSimuladoForUser } from "@/lib/simulado";
import { createStudyPlanForUser } from "@/lib/study-plan-generation";

/** Ação executada pela IA no app; o chat mostra o link e leva o aluno até ela. */
export type ChatAction = { type: "quiz" | "simulado" | "plano" | "flashcards"; href: string; label: string };

export const chatSystemPrompt = `Você é a IA de estudos do Easy Education e ajuda estudantes brasileiros de escola, faculdade, vestibular e concurso.

Como responder:
- Sempre em português do Brasil, tratando o aluno por "você", com frases curtas e claras.
- Escreva em texto simples. NÃO use markdown: nada de asteriscos, negrito, títulos com #, nem tabelas.
- Para listas, use uma linha por item começando com "- " ou com números ("1. ").
- Vá direto ao ponto: explique o porquê e diga o próximo passo. Sem emojis.

Você tem controle do app e deve AGIR, não ensinar o aluno a fazer:
- Pediu questões, quiz ou exercícios? Chame criar_quiz.
- Pediu simulado? Chame criar_simulado.
- Pediu plano, cronograma ou rotina de estudo? Chame criar_plano_de_estudo.
- Pediu flashcards ou cartões de revisão? Chame criar_flashcards.
Se faltar algum detalhe, use valores padrão razoáveis em vez de perguntar. Só pergunte se o pedido for ambíguo de verdade.
Para dúvidas de conteúdo, explique normalmente, no nível do aluno. As questões seguem o estilo da prova que ele escolheu no perfil.`;

const difficultyEnum = ["facil", "medio", "dificil"];

export const chatTools: FunctionDeclaration[] = [
  {
    name: "criar_quiz",
    description: "Gera um quiz de múltipla escolha no app e abre para o aluno responder.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        materia: { type: Type.STRING, description: "Matéria, ex.: Matemática, Biologia, ou Multidisciplinar." },
        assunto: { type: Type.STRING, description: "Assunto específico, ex.: funções do 2º grau. Opcional." },
        quantidade: { type: Type.INTEGER, description: "Número de questões, de 5 a 20. Padrão 10." },
        dificuldade: { type: Type.STRING, enum: difficultyEnum, description: "Padrão medio." },
        estilo: { type: Type.STRING, description: "Estilo da prova só se o aluno pedir um específico (ex.: ENEM, faculdade, concurso). Sem isso, deixe vazio e o app usa o objetivo do perfil." },
      },
      required: ["materia"],
    },
  },
  {
    name: "criar_simulado",
    description: "Gera um simulado com tempo de prova no app e abre para o aluno.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        materia: { type: Type.STRING, description: "Matéria ou Multidisciplinar." },
        assunto: { type: Type.STRING, description: "Tema central. Opcional." },
        quantidade: { type: Type.INTEGER, description: "Número de questões, de 5 a 20. Padrão 20." },
      },
      required: ["materia"],
    },
  },
  {
    name: "criar_plano_de_estudo",
    description: "Monta e salva um plano de estudo semanal no app.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        objetivo: { type: Type.STRING, description: "Objetivo, ex.: ENEM 2026. Se não dito, use o objetivo do perfil." },
        horas_por_dia: { type: Type.NUMBER, description: "Horas de estudo por dia, de 1 a 8." },
        materias: {
          type: Type.ARRAY,
          description: "Matérias do plano com dificuldade de 1 (fácil) a 5 (difícil).",
          items: {
            type: Type.OBJECT,
            properties: { nome: { type: Type.STRING }, dificuldade: { type: Type.INTEGER } },
            required: ["nome"],
          },
        },
        metodo: { type: Type.STRING, description: "Método de estudo, ex.: Pomodoro, Active Recall." },
        data_prova: { type: Type.STRING, description: "Data da prova (AAAA-MM-DD), se informada." },
      },
    },
  },
  {
    name: "criar_flashcards",
    description: "Gera um deck de flashcards no app para revisão espaçada.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING, description: "Título curto do deck." },
        materia: { type: Type.STRING },
        assunto: { type: Type.STRING, description: "Assunto dos cartões. Opcional." },
        quantidade: { type: Type.INTEGER, description: "Número de cartões, de 5 a 30. Padrão 12." },
      },
      required: ["materia"],
    },
  },
];

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined);

const planSubjectsSchema = z
  .array(z.object({ nome: z.string().min(1), dificuldade: z.number().optional() }))
  .catch([]);

function revalidateAll() {
  for (const path of ["/dashboard", "/dashboard/quizzes", "/dashboard/simulados", "/dashboard/plano", "/dashboard/flashcards", "/dashboard/desempenho"]) {
    revalidatePath(path);
  }
}

export class ChatActionError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Executa a função pedida pela IA e devolve a resposta do chat + a ação para abrir. */
export async function runChatTool(userId: string, name: string, args: Record<string, unknown>): Promise<{ reply: string; action: ChatAction }> {
  const prisma = getPrisma();

  if (name === "criar_quiz") {
    if (!checkRateLimit(`quiz:${userId}`).ok) throw new ChatActionError("Muitos quizzes em pouco tempo. Tente de novo em um minuto.", 429);
    const subject = text(args.materia) ?? "Conhecimentos gerais";
    const topic = text(args.assunto);
    const questionCount = clampInt(args.quantidade, 5, 20, 10);
    const difficulty = difficultyEnum.includes(String(args.dificuldade)) ? String(args.dificuldade) : "medio";
    const quiz = await createQuizForUser({ userId, subject, topic, questionCount, difficulty, model: text(args.estilo) });
    revalidateAll();
    return {
      reply: `Pronto. Criei o quiz "${quiz.title}" com ${quiz.questionCount} questões de ${subject}. Vou abrir para você responder.`,
      action: { type: "quiz", href: `/dashboard/quizzes/${quiz.id}`, label: "Abrir quiz" },
    };
  }

  if (name === "criar_simulado") {
    if (!checkRateLimit(`quiz:${userId}`).ok) throw new ChatActionError("Muitos simulados em pouco tempo. Tente de novo em um minuto.", 429);
    const subject = text(args.materia) ?? "Multidisciplinar";
    const quiz = await createSimuladoForUser({ userId, subject, topic: text(args.assunto), questionCount: clampInt(args.quantidade, 5, 20, 20) });
    revalidateAll();
    return {
      reply: `Pronto. Criei o simulado "${quiz.title}" com ${quiz.questionCount} questões. Vou abrir para você começar.`,
      action: { type: "simulado", href: `/dashboard/simulados/${quiz.id}`, label: "Abrir simulado" },
    };
  }

  if (name === "criar_plano_de_estudo") {
    if (!checkRateLimit(`study-plan:${userId}`).ok) throw new ChatActionError("Muitos planos em pouco tempo. Tente de novo em um minuto.", 429);
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const subjects = planSubjectsSchema
      .parse(args.materias)
      .slice(0, 8)
      .map((item) => ({ name: item.nome.slice(0, 60), difficulty: clampInt(item.dificuldade, 1, 5, 3) }));
    const hours = Number(args.horas_por_dia);
    const dailyHours = Number.isFinite(hours) ? Math.min(8, Math.max(1, hours)) : Math.min(8, Math.max(1, (profile?.dailyMinutes ?? 60) / 60));
    const goal = text(args.objetivo) ?? profile?.studyGoal ?? "Estudos gerais";
    const { plan } = await createStudyPlanForUser(userId, {
      goal,
      targetDate: text(args.data_prova) ?? profile?.targetDate?.toISOString().slice(0, 10) ?? null,
      dailyHours,
      subjects: subjects.length ? subjects : [{ name: "Matematica", difficulty: 3 }],
      method: text(args.metodo) ?? profile?.studyMethod ?? "Active Recall",
    });
    revalidateAll();
    const blocks = plan.days.reduce((sum, day) => sum + day.blocks.length, 0);
    return {
      reply: `Pronto. Montei seu plano semanal para ${goal}, com ${blocks} blocos de estudo e cerca de ${dailyHours}h por dia. Vou abrir o plano.`,
      action: { type: "plano", href: "/dashboard/plano", label: "Abrir plano" },
    };
  }

  if (name === "criar_flashcards") {
    if (!checkRateLimit(`flashcards:${userId}`).ok) throw new ChatActionError("Muitos decks em pouco tempo. Tente de novo em um minuto.", 429);
    const subject = text(args.materia) ?? "Revisão";
    const topic = text(args.assunto);
    const deck = await createFlashcardDeckForUser({
      userId,
      title: text(args.titulo) ?? `Flashcards de ${topic ?? subject}`,
      subject,
      topic,
      count: clampInt(args.quantidade, 5, 30, 12),
    });
    revalidateAll();
    return {
      reply: `Pronto. Criei o deck "${deck.title}". Vou abrir para você revisar.`,
      action: { type: "flashcards", href: `/dashboard/flashcards/${deck.id}`, label: "Abrir flashcards" },
    };
  }

  throw new ChatActionError("Não consegui executar esse pedido. Tente descrever de outro jeito.");
}
