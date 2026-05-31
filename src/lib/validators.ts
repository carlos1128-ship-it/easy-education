import { z } from "zod";

export const emailSchema = z.string().email("Informe um e-mail valido.");

export const signUpSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo."),
  email: emailSchema,
  password: z.string().min(8, "Use pelo menos 8 caracteres."),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const onboardingSchema = z.object({
  goal: z.string().min(2),
  targetDate: z.string().optional(),
  level: z.string().min(2),
  dailyMinutes: z.number().min(60).max(480),
  studyMethod: z.string().min(2),
  subjects: z.array(z.object({ name: z.string(), difficulty: z.number().min(1).max(5) })),
});

export const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(6000),
    }),
  ),
  fileId: z.string().optional(),
});

export const quizGenerateSchema = z.object({
  topic: z.string().optional(),
  fileId: z.string().optional(),
  subject: z.string().min(2),
  difficulty: z.string().min(2),
  questionCount: z.number().min(5).max(20),
  model: z.string().min(2),
});

export const flashcardGenerateSchema = z.object({
  title: z.string().min(2),
  subject: z.string().min(2),
  topic: z.string().optional(),
  fileId: z.string().optional(),
  count: z.number().min(5).max(30),
});

export const essaySchema = z.object({
  title: z.string().min(2),
  theme: z.string().min(2),
  model: z.enum(["ENEM", "SAT"]),
  content: z.string().min(300, "Escreva pelo menos 300 caracteres."),
});
