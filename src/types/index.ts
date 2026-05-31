export type StudySubject = {
  name: string;
  difficulty: number;
  priority?: "low" | "medium" | "high";
};

export type StudyPlanBlock = {
  subject: string;
  topic: string;
  durationMinutes: number;
  method: string;
  type: "estudo" | "revisao" | "simulado" | "redacao";
};

export type StudyPlanDay = {
  dayOfWeek: string;
  blocks: StudyPlanBlock[];
};

export type GeneratedStudyPlan = {
  days: StudyPlanDay[];
  weeklyGoals: string[];
  tips: string[];
};

export type GeneratedQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type GeneratedFlashcard = {
  front: string;
  back: string;
};

export type EssayFeedback = {
  totalScore: number;
  criteria: Record<string, { score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  generalFeedback: string;
};

export type ChatInputMessage = {
  role: "user" | "assistant";
  content: string;
};
