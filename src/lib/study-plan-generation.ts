import { generateJSON } from "@/lib/gemini";
import { getPrisma } from "@/lib/prisma";
import { getSubjectColor } from "@/lib/subjects";
import type { GeneratedStudyPlan, StudySubject } from "@/types";

type StudyPlanInput = {
  goal: string;
  targetDate?: string | null;
  dailyHours: number;
  subjects: StudySubject[];
  method: string;
};

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function fallbackStudyPlan(input: StudyPlanInput): GeneratedStudyPlan {
  const subjects = input.subjects.length ? input.subjects : [{ name: "Matematica", difficulty: 3 }];
  const dailyMinutes = Math.max(60, Math.round(input.dailyHours * 60));
  const blockMinutes = Math.max(30, Math.min(90, Math.floor(dailyMinutes / 2)));

  return {
    days: days.map((dayOfWeek, dayIndex) => {
      const first = subjects[dayIndex % subjects.length];
      const second = subjects[(dayIndex + 2) % subjects.length] ?? first;
      return {
        dayOfWeek,
        blocks: [
          {
            subject: first.name,
            topic: `Fundamentos e questoes de ${first.name}`,
            durationMinutes: blockMinutes,
            method: input.method,
            type: "estudo",
          },
          {
            subject: second.name,
            topic: dayIndex === 6 ? "Revisao semanal e simulado curto" : `Revisao guiada de ${second.name}`,
            durationMinutes: blockMinutes,
            method: dayIndex === 6 ? "Simulado" : "Revisao espacada",
            type: dayIndex === 6 ? "simulado" : "revisao",
          },
        ],
      };
    }),
    weeklyGoals: [
      `Cumprir pelo menos ${Math.round(input.dailyHours * 7)} horas de estudo na semana`,
      "Registrar todos os blocos concluidos no painel",
      "Revisar os assuntos com menor desempenho antes do proximo simulado",
    ],
    tips: ["Comece pelos assuntos mais dificeis enquanto sua energia ainda esta alta."],
  };
}

function normalizePlan(plan: GeneratedStudyPlan | null, input: StudyPlanInput) {
  if (!plan?.days?.length) return fallbackStudyPlan(input);

  return {
    days: days.map((day, index) => {
      const existing = plan.days.find((item) => item.dayOfWeek?.toLowerCase() === day) ?? plan.days[index];
      return {
        dayOfWeek: day,
        blocks: (existing?.blocks ?? fallbackStudyPlan(input).days[index].blocks).slice(0, 2),
      };
    }),
    weeklyGoals: Array.isArray(plan.weeklyGoals) && plan.weeklyGoals.length ? plan.weeklyGoals : fallbackStudyPlan(input).weeklyGoals,
    tips: Array.isArray(plan.tips) && plan.tips.length ? plan.tips : fallbackStudyPlan(input).tips,
  } satisfies GeneratedStudyPlan;
}

export async function generateStudyPlanData(input: StudyPlanInput) {
  const prompt = `Monte um plano de estudo semanal compacto para um estudante com o seguinte perfil: Objetivo: ${input.goal}. Data da prova: ${input.targetDate ?? "nao informada"}. Horas por dia: ${input.dailyHours}. Materias e dificuldades: ${JSON.stringify(input.subjects)}. Metodo: ${input.method}. Retorne exatamente 7 dias, com no maximo 2 blocos por dia, textos curtos e esta estrutura {"days":[{"dayOfWeek":"monday","blocks":[{"subject":string,"topic":string,"durationMinutes":number,"method":string,"type":"estudo|revisao|simulado|redacao"}]}],"weeklyGoals":[string],"tips":[string]}. Use dayOfWeek em ingles: sunday, monday, tuesday, wednesday, thursday, friday, saturday. Responda APENAS com JSON valido.`;

  try {
    return normalizePlan(await generateJSON<GeneratedStudyPlan>(prompt), input);
  } catch {
    return fallbackStudyPlan(input);
  }
}

export async function createStudyPlanForUser(userId: string, input: StudyPlanInput) {
  const prisma = getPrisma();
  const plan = await generateStudyPlanData(input);
  const subjects = input.subjects.length ? input.subjects : [{ name: "Matematica", difficulty: 3 }];
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 7);

  const record = await prisma.studyPlan.create({
    data: {
      userId,
      title: `Plano semanal - ${input.goal}`,
      goal: input.goal,
      startDate: now,
      endDate: end,
      dailyMinutes: Math.round(input.dailyHours * 60),
      planData: plan,
      subjects: {
        create: subjects.map((subject) => ({
          name: subject.name,
          difficulty: subject.difficulty,
          weeklyHours: Math.max(1, Math.round(input.dailyHours)),
          color: getSubjectColor(subject.name),
        })),
      },
    },
  });

  return { record, plan };
}
