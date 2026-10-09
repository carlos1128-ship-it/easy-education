import { z } from "zod";

/**
 * Personalização do aluno, preenchida no onboarding. Define o estilo das questões,
 * o tom das explicações e o plano. Fica em `profiles.personalization` (JSON).
 */

export const PURPOSES = [
  { id: "escola", label: "Ir melhor na escola", hint: "Provas, trabalhos e recuperação do colégio" },
  { id: "enem_vestibular", label: "ENEM ou vestibular", hint: "Entrar na faculdade" },
  { id: "concurso", label: "Concurso público", hint: "Cargo, banca e edital" },
  { id: "faculdade", label: "Faculdade", hint: "Disciplinas e provas do curso" },
  { id: "idioma", label: "Intercâmbio ou idioma", hint: "Prova de proficiência, viagem ou morar fora" },
  { id: "certificacao", label: "Carreira ou certificação", hint: "OAB, CFC, certificações de TI e outras" },
  { id: "conhecimento", label: "Aprender por conta própria", hint: "Curiosidade, cultura ou um assunto novo" },
] as const;

export type PurposeId = (typeof PURPOSES)[number]["id"];

export const SCHOOL_YEARS = ["6º ano", "7º ano", "8º ano", "9º ano", "1º ano do ensino médio", "2º ano do ensino médio", "3º ano do ensino médio", "Cursinho", "Já terminei a escola"];
export const ENTRANCE_EXAMS = ["ENEM", "Fuvest", "Unicamp", "Unesp", "UERJ", "UFPR", "Medicina (vários)", "Outro vestibular"];
export const EXAM_BOARDS = ["Cebraspe", "FGV", "FCC", "Vunesp", "Cesgranrio", "IBFC", "Quadrix", "Outra", "Ainda não sei"];
export const SEMESTERS = ["1º ou 2º semestre", "3º ou 4º semestre", "5º ou 6º semestre", "7º semestre ou mais", "Pós-graduação"];
export const LANGUAGES = ["Inglês", "Espanhol", "Francês", "Alemão", "Italiano", "Japonês", "Outro"];
export const LANGUAGE_EXAMS = ["IELTS", "TOEFL", "Cambridge (B2 First, C1 Advanced)", "Duolingo English Test", "DELE", "DELF/DALF", "TestDaF/Goethe", "CELI", "JLPT", "Nenhuma prova"];
export const LANGUAGE_LEVELS = [
  { value: "A1", hint: "Sei pouquíssimo" },
  { value: "A2", hint: "Frases simples" },
  { value: "B1", hint: "Me viro em conversas" },
  { value: "B2", hint: "Converso bem" },
  { value: "C1", hint: "Avançado" },
  { value: "C2", hint: "Quase nativo" },
];
export const DEPTHS = [
  { value: "introdutorio", label: "Do zero", hint: "Explique o básico primeiro" },
  { value: "intermediario", label: "Já sei um pouco", hint: "Quero aprofundar" },
  { value: "aprofundado", label: "Quero ir fundo", hint: "Detalhes e nuances" },
] as const;

export const WEEKDAYS = [
  { value: "monday", label: "Seg" },
  { value: "tuesday", label: "Ter" },
  { value: "wednesday", label: "Qua" },
  { value: "thursday", label: "Qui" },
  { value: "friday", label: "Sex" },
  { value: "saturday", label: "Sáb" },
  { value: "sunday", label: "Dom" },
] as const;

export const PERIODS = [
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "variado", label: "Varia" },
] as const;

export const CHALLENGES = [
  { value: "esquecimento", label: "Esqueço rápido o que estudei" },
  { value: "tempo", label: "Tenho pouco tempo" },
  { value: "foco", label: "Perco o foco fácil" },
  { value: "comeco", label: "Não sei por onde começar" },
  { value: "ansiedade", label: "Fico nervoso(a) na prova" },
  { value: "interpretacao", label: "Interpretar enunciados e textos" },
  { value: "calculo", label: "Contas e raciocínio lógico" },
  { value: "escrita", label: "Escrever bem" },
  { value: "base", label: "Me falta base do conteúdo" },
] as const;

export const EXPLANATION_STYLES = [
  { value: "direta", label: "Direto ao ponto", hint: "Resposta curta e objetiva" },
  { value: "passo_a_passo", label: "Passo a passo", hint: "Cada etapa explicada" },
  { value: "exemplos", label: "Com exemplos", hint: "Situações do dia a dia" },
  { value: "analogias", label: "Com comparações", hint: "Ligando com o que já conheço" },
] as const;

export const PRACTICE_PREFERENCES = [
  { value: "questoes", label: "Resolvendo questões" },
  { value: "flashcards", label: "Revisando com flashcards" },
  { value: "leitura", label: "Lendo resumos e explicações" },
  { value: "equilibrado", label: "Um pouco de tudo" },
] as const;

/** Temas para quem estuda por conta própria (caixinhas; "Outros" abre um campo livre). */
export const INTEREST_OPTIONS = [
  "Artes", "Música", "Fotografia", "Design", "Literatura", "Escrita criativa", "História", "Filosofia", "Psicologia",
  "Sociologia", "Política e atualidades", "Geografia", "Astronomia", "Biologia", "Química", "Física", "Matemática",
  "Programação", "Tecnologia e IA", "Finanças pessoais", "Economia", "Empreendedorismo", "Marketing", "Saúde e nutrição",
  "Direito do dia a dia", "Idiomas", "Culinária", "Meio ambiente",
] as const;

/**
 * Métodos de estudo. A eficácia segue a revisão de Dunlosky et al. (2013), "Improving Students' Learning
 * With Effective Learning Techniques": testar-se e espaçar a revisão têm a maior eficácia; intercalar,
 * explicar com as próprias palavras e perguntar "por quê?" são moderados; resumir, grifar e reler, baixos.
 * Pomodoro e blocos organizam o tempo e o foco (não são técnicas de memorização).
 */
export const STUDY_METHODS = [
  { value: "Questões e simulados", hint: "Testar o que sabe é o que mais fixa o conteúdo", evidence: "alta" },
  { value: "Revisão espaçada", hint: "Revisar em intervalos, pouco antes de esquecer", evidence: "alta" },
  { value: "Active Recall", hint: "Lembrar sem olhar a resposta antes de conferir", evidence: "alta" },
  { value: "Prática intercalada", hint: "Misturar assuntos e tipos de questão na mesma sessão", evidence: "moderada" },
  { value: "Técnica Feynman", hint: "Explicar com suas palavras, como se ensinasse alguém", evidence: "moderada" },
  { value: "Perguntar por quê", hint: "Para cada fato, buscar o motivo e a ligação com o que já sabe", evidence: "moderada" },
  { value: "Pomodoro", hint: "25 min de foco e 5 de pausa; ajuda quem perde o foco", evidence: "foco" },
  { value: "Blocos de estudo", hint: "Horários fixos na agenda para cada matéria", evidence: "foco" },
  { value: "Resumos e mapas mentais", hint: "Organizam ideias; funcionam melhor junto com questões", evidence: "baixa" },
] as const;

/** Habilidades usadas no lugar das matérias quando o objetivo é idioma. */
export const LANGUAGE_SKILLS = [
  { name: "Leitura (Reading)", color: "#0EA5E9" },
  { name: "Escrita (Writing)", color: "#EC4899" },
  { name: "Compreensão auditiva (Listening)", color: "#22C55E" },
  { name: "Conversação (Speaking)", color: "#F97316" },
  { name: "Gramática", color: "#6366F1" },
  { name: "Vocabulário", color: "#EAB308" },
] as const;

const short = (max: number) => z.string().trim().max(max).optional();

export const personalizationSchema = z.object({
  purpose: z.enum(PURPOSES.map((item) => item.id) as [PurposeId, ...PurposeId[]]),
  exam: short(80),
  schoolYear: short(40),
  course: short(80),
  semester: short(40),
  board: short(40),
  role: short(80),
  language: short(30),
  languageLevel: short(4),
  destination: short(60),
  interests: short(400),
  depth: z.enum(["introdutorio", "intermediario", "aprofundado"]).optional(),
  targetScore: short(60),
  studyDays: z.array(z.enum(WEEKDAYS.map((day) => day.value) as [string, ...string[]])).max(7).optional(),
  period: z.enum(["manha", "tarde", "noite", "variado"]).optional(),
  challenges: z.array(z.enum(CHALLENGES.map((item) => item.value) as [string, ...string[]])).max(9).optional(),
  explanationStyle: z.enum(["direta", "passo_a_passo", "exemplos", "analogias"]).optional(),
  practicePreference: z.enum(["questoes", "flashcards", "leitura", "equilibrado"]).optional(),
});

export type Personalization = z.infer<typeof personalizationSchema>;

export function parsePersonalization(value: unknown): Personalization | null {
  const parsed = personalizationSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const labelOf = <T extends { value: string; label: string }>(items: readonly T[], value?: string) =>
  items.find((item) => item.value === value)?.label;

/** Rótulo curto do objetivo, mostrado no menu e usado como `studyGoal`. */
export function goalLabel(p: Personalization) {
  switch (p.purpose) {
    case "escola":
      return p.schoolYear ? `Escola · ${p.schoolYear}` : "Provas escolares";
    case "enem_vestibular":
      return p.exam && p.exam !== "Outro vestibular" ? p.exam : "Vestibular";
    case "concurso":
      return p.role ? `Concurso · ${p.role}` : "Concurso público";
    case "faculdade":
      return p.course ? `Faculdade · ${p.course}` : "Faculdade";
    case "idioma":
      return [p.language ?? "Idioma", p.exam && p.exam !== "Nenhuma prova" ? p.exam : null].filter(Boolean).join(" · ");
    case "certificacao":
      return p.exam ? `Certificação · ${p.exam}` : "Certificação";
    case "conhecimento":
      return p.interests ? `Conhecimento · ${p.interests.slice(0, 40)}` : "Conhecimento livre";
  }
}

const BOARD_STYLE: Record<string, string> = {
  Cebraspe: "padrão Cebraspe: afirmações para julgar, cobrança literal da lei e do conteúdo, pegadinhas de detalhe",
  FGV: "padrão FGV: enunciados longos, casos práticos e interpretação",
  FCC: "padrão FCC: cobrança direta e literal do conteúdo e da legislação",
  Vunesp: "padrão Vunesp: enunciados objetivos e cobrança de conteúdo clássico",
  Cesgranrio: "padrão Cesgranrio: situações práticas e conhecimento técnico do cargo",
};

/** Estilo das questões geradas para este aluno. */
export function examStyleFromPersonalization(p: Personalization) {
  switch (p.purpose) {
    case "escola":
      return `prova escolar do ${p.schoolYear ?? "ensino médio"}, com linguagem clara e cobrança do conteúdo visto em sala, no nível dessa série`;
    case "enem_vestibular":
      if (!p.exam || p.exam === "ENEM") return "ENEM, com textos-base, situações do cotidiano, interpretação e interdisciplinaridade";
      return `vestibular ${p.exam === "Outro vestibular" ? "brasileiro" : p.exam}, seguindo o padrão e o nível de exigência dessa prova`;
    case "concurso":
      return `concurso público${p.role ? ` para ${p.role}` : ""}, ${BOARD_STYLE[p.board ?? ""] ?? "no padrão das principais bancas, com cobrança literal e pegadinhas comuns"}`;
    case "faculdade":
      return `prova de graduação${p.course ? ` de ${p.course}` : ""}${p.semester ? ` (${p.semester})` : ""}, com profundidade técnica e termos da área`;
    case "idioma":
      return `estudo de ${p.language ?? "idioma estrangeiro"} no nível ${p.languageLevel ?? "intermediário"} do Quadro Europeu (QECR)${
        p.exam && p.exam !== "Nenhuma prova" ? `, no formato das questões do ${p.exam}` : ""
      }: enunciados e alternativas no idioma estudado (adequados ao nível), explicação em português`;
    case "certificacao":
      return `${p.exam ?? "certificação profissional"}, no padrão e no nível das questões oficiais dessa prova`;
    case "conhecimento":
      return `estudo por interesse pessoal, nível ${labelOf(DEPTHS.map((d) => ({ value: d.value, label: d.label })), p.depth) ?? "intermediário"}: perguntas de compreensão e aplicação, sem pegadinhas de prova`;
  }
}

type ProfileLike = {
  studyGoal?: string | null;
  studyMethod?: string | null;
  level?: string | null;
  targetDate?: Date | null;
  dailyMinutes?: number | null;
  personalization?: unknown;
};

/**
 * Resumo do aluno para os prompts da IA (quiz, simulado, flashcards, plano, chat, redação, vídeo).
 * Só dados de estudo: nada de nome, e-mail ou dado pessoal sensível.
 */
export function buildLearnerContext(profile: ProfileLike | null | undefined) {
  if (!profile) return "";
  const p = parsePersonalization(profile.personalization);
  const lines: string[] = [];

  lines.push(`- Objetivo: ${p ? goalLabel(p) : profile.studyGoal ?? "estudos gerais"}.`);
  if (p) {
    const purpose = PURPOSES.find((item) => item.id === p.purpose);
    if (purpose) lines.push(`- Motivo de estudar: ${purpose.label.toLowerCase()} (${purpose.hint.toLowerCase()}).`);
    if (p.schoolYear) lines.push(`- Série/etapa: ${p.schoolYear}.`);
    if (p.course) lines.push(`- Curso: ${p.course}${p.semester ? `, ${p.semester}` : ""}.`);
    if (p.role || p.board) lines.push(`- Concurso: ${[p.role, p.board && p.board !== "Ainda não sei" ? `banca ${p.board}` : null].filter(Boolean).join(", ")}.`);
    if (p.language) lines.push(`- Idioma: ${p.language}, nível ${p.languageLevel ?? "não informado"}${p.destination ? `, destino ${p.destination}` : ""}.`);
    if (p.exam && p.purpose !== "enem_vestibular") lines.push(`- Prova-alvo: ${p.exam}.`);
    if (p.interests) lines.push(`- Interesses: ${p.interests}.`);
    if (p.targetScore) lines.push(`- Meta: ${p.targetScore}.`);
    const challenges = (p.challenges ?? []).map((value) => labelOf(CHALLENGES, value)).filter(Boolean);
    if (challenges.length) lines.push(`- Dificuldades que relatou: ${challenges.join("; ").toLowerCase()}.`);
    const style = EXPLANATION_STYLES.find((item) => item.value === p.explanationStyle);
    if (style) lines.push(`- Prefere explicações: ${style.label.toLowerCase()} (${style.hint.toLowerCase()}).`);
    const practice = labelOf(PRACTICE_PREFERENCES, p.practicePreference);
    if (practice) lines.push(`- Aprende melhor: ${practice.toLowerCase()}.`);
  }
  if (profile.level) lines.push(`- Nível que declarou: ${profile.level}.`);
  if (profile.studyMethod) lines.push(`- Métodos de estudo que escolheu: ${profile.studyMethod}.`);
  if (profile.targetDate) {
    const days = Math.ceil((profile.targetDate.getTime() - Date.now()) / 86_400_000);
    if (days > 0) lines.push(`- Prova em ${days} dias.`);
  }
  if (profile.dailyMinutes) lines.push(`- Tempo por dia: ${profile.dailyMinutes} min.`);
  return lines.join("\n");
}

/** Instruções extras para o tom das explicações, a partir das preferências do aluno. */
export function explanationGuidance(profile: ProfileLike | null | undefined) {
  const p = parsePersonalization(profile?.personalization);
  if (!p) return "";
  const rules: string[] = [];
  if (p.explanationStyle === "direta") rules.push("explicações curtas e objetivas");
  if (p.explanationStyle === "passo_a_passo") rules.push("explicações em passos numerados quando houver raciocínio");
  if (p.explanationStyle === "exemplos") rules.push("explicações com um exemplo do cotidiano");
  if (p.explanationStyle === "analogias") rules.push("explicações com uma comparação simples");
  if (p.challenges?.includes("interpretacao")) rules.push("mostre na explicação qual parte do enunciado leva à resposta");
  if (p.challenges?.includes("base")) rules.push("relembre o conceito básico antes de explicar a resposta");
  if (p.challenges?.includes("calculo")) rules.push("mostre as contas passo a passo");
  return rules.length ? `Ajuste as explicações a este aluno: ${rules.join("; ")}.` : "";
}

/** O aluno escolheu o ENEM na personalização? Só ele vê os simulados de provas anteriores do ENEM. */
export function isEnemStudent(value: unknown) {
  const p = parsePersonalization(value);
  return Boolean(p && p.purpose === "enem_vestibular" && (!p.exam || p.exam === "ENEM"));
}

/** Concurso que o aluno informou (cargo e banca), para o simulado personalizado. */
export function concursoTarget(value: unknown) {
  const p = parsePersonalization(value);
  if (!p || p.purpose !== "concurso") return null;
  return { role: p.role?.trim() || null, board: p.board && p.board !== "Ainda não sei" && p.board !== "Outra" ? p.board : null };
}
