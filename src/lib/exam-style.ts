import { buildLearnerContext, examStyleFromPersonalization, explanationGuidance, parsePersonalization } from "@/lib/learner-profile";
import { getPrisma } from "@/lib/prisma";

/**
 * Estilo das questões geradas pela IA, a partir do objetivo escolhido no onboarding.
 * Um universitário recebe questões de graduação; um concurseiro, no padrão de banca.
 * Com a personalização detalhada, o estilo considera série, banca, curso, idioma e nível.
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

export type LearnerPromptProfile = {
  /** Estilo da prova para as questões. */
  style: string;
  /** Resumo do aluno para incluir nos prompts. */
  context: string;
  /** Regras de tom das explicações (pode ser vazio). */
  guidance: string;
};

/** Tudo o que os geradores precisam saber do aluno, numa consulta só. */
/** Perfil do aluno para os prompts. Com `subject`, o estilo acompanha a matéria pedida (ex.: idioma só em aula de idioma). */
export async function getLearnerPromptProfile(userId: string, subject?: string | null): Promise<LearnerPromptProfile> {
  const profile = await getPrisma().profile.findUnique({
    where: { userId },
    select: { studyGoal: true, studyMethod: true, level: true, targetDate: true, dailyMinutes: true, personalization: true },
  });
  const personalization = parsePersonalization(profile?.personalization);
  return {
    style: personalization ? examStyleFromPersonalization(personalization, subject) : examStyleFor(profile?.studyGoal),
    context: buildLearnerContext(profile),
    guidance: explanationGuidance(profile),
  };
}

export async function getExamStyleForUser(userId: string) {
  return (await getLearnerPromptProfile(userId)).style;
}

/** Bloco de texto padrão para anexar aos prompts de geração. */
export function learnerPromptBlock(learner: LearnerPromptProfile) {
  if (!learner.context && !learner.guidance) return "";
  return `\nPerfil do aluno (personalize o conteúdo, os exemplos e a dificuldade para ele):\n${learner.context}${learner.guidance ? `\n${learner.guidance}` : ""}`;
}
