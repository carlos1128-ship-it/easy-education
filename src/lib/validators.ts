import { z } from "zod";
import { personalizationSchema } from "@/lib/learner-profile";

export const emailSchema = z.string().trim().max(254, "E-mail muito longo.").email("Informe um e-mail valido.");

export const signUpSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo.").max(80, "Nome muito longo."),
  email: emailSchema,
  password: z.string().min(8, "Use pelo menos 8 caracteres.").max(128, "Senha muito longa."),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const onboardingSchema = z.object({
  goal: z.string().min(2).max(160),
  targetDate: z.string().max(40).optional(),
  level: z.string().min(2).max(60),
  dailyMinutes: z.number().min(30).max(480),
  studyMethod: z.string().min(2).max(200),
  subjects: z.array(z.object({ name: z.string().max(80), difficulty: z.number().min(1).max(5) })).max(30),
  personalization: personalizationSchema.optional(),
  /** Refazendo a personalização: arquiva o plano atual e monta outro. */
  regeneratePlan: z.boolean().optional(),
});

export const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(6000),
    }),
  ).min(1).max(40),
  fileId: z.string().max(64).optional(),
});

export const quizGenerateSchema = z.object({
  topic: z.string().max(500).optional(),
  fileId: z.string().max(64).optional(),
  subject: z.string().min(2).max(300),
  difficulty: z.string().min(2).max(20),
  // Quiz vai até 20 questões; simulado até 90 (o limite do dia, em questões, é conferido em consumeFeature).
  questionCount: z.number().int().min(5).max(90),
  model: z.string().min(2).max(60).optional(),
}).refine((value) => value.difficulty === "simulado" || value.questionCount <= 20, { message: "Quiz tem no máximo 20 questões.", path: ["questionCount"] });

export const flashcardGenerateSchema = z.object({
  title: z.string().min(2).max(160),
  subject: z.string().min(2).max(300),
  topic: z.string().max(500).optional(),
  fileId: z.string().max(64).optional(),
  count: z.number().min(5).max(30),
});

export const essaySchema = z.object({
  title: z.string().min(2).max(160),
  theme: z.string().min(2).max(300),
  // O SAT não tem redação desde 2021: a correção segue a grade do Enem.
  model: z.literal("ENEM").catch("ENEM"),
  content: z.string().min(300, "Escreva pelo menos 300 caracteres.").max(12000, "Texto muito longo para uma redação."),
});
