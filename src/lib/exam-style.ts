import { getPrisma } from "@/lib/prisma";

/**
 * Estilo das questões geradas pela IA, a partir do objetivo escolhido no onboarding.
 * Um universitário recebe questões de graduação; um concurseiro, no padrão de banca.
 */
const styles: Record<string, string> = {
  "provas escolares": "prova escolar do ensino médio, com linguagem clara e cobrança do conteúdo visto em sala",
  enem: "ENEM, com textos-base, situações do cotidiano e interpretação",
  vestibular: "vestibulares brasileiros, com cobrança direta de conteúdo e alguma contextualização",
  faculdade: "prova de graduação (ensino superior), com profundidade técnica e termos da área",
  "concurso público": "concursos públicos brasileiros, no padrão das principais bancas, com cobrança literal e pegadinhas comuns",
  "sat/processo internacional": "SAT e processos seletivos internacionais, com raciocínio e leitura crítica",
};

const DEFAULT_STYLE = "provas brasileiras, com enunciados contextualizados e nível adequado ao assunto";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function examStyleFor(goal?: string | null) {
  if (!goal?.trim()) return DEFAULT_STYLE;
  return styles[normalize(goal)] ?? `${goal.trim()}, com enunciados contextualizados e nível adequado ao assunto`;
}

export async function getExamStyleForUser(userId: string) {
  const profile = await getPrisma().profile.findUnique({ where: { userId }, select: { studyGoal: true } });
  return examStyleFor(profile?.studyGoal);
}
