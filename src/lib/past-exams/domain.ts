import { z } from "zod";

export class ExamError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// URLs are links only. No server-side retrieval of external documents.
export const sourceUrl = z
  .string()
  .max(2000)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Informe um link HTTPS sem credenciais.");

export const regionSchema = z
  .object({
    page: z.number().int().min(1).max(2000),
    x: z.number().min(0).max(1).default(0),
    y: z.number().min(0).max(1).default(0),
    width: z.number().positive().max(1).default(1),
    height: z.number().positive().max(1).default(1),
  })
  .refine(
    (r) => r.x + r.width <= 1.00001 && r.y + r.height <= 1.00001,
    "Recorte fora da página.",
  );

export const itemSchema = z.object({
  number: z.number().int().min(1).max(1000),
  format: z.enum(["mcq4", "mcq5", "boolean", "written"]),
  subject: z.string().trim().min(1).max(120),
  topic: z.string().max(200).default(""),
  regions: z.array(regionSchema).max(20).default([]),
  sourceUrl: sourceUrl.or(z.literal("")),
  correct: z.string().max(16000).default(""),
  annulled: z.boolean().default(false),
  explanation: z.string().max(16000).default(""),
  explanationReviewed: z.boolean().default(false),
});
export type ExamItemData = z.infer<typeof itemSchema>;
export type StudentAnswer = {
  number: number;
  value: string;
  reviewed: boolean;
};
export const optionsFor = (format: string) =>
  format === "boolean"
    ? ["C", "E"]
    : format === "mcq4"
      ? ["A", "B", "C", "D"]
      : format === "mcq5"
        ? ["A", "B", "C", "D", "E"]
        : [];

export const documentSchema = z.object({
  sourceUrl,
  rightsStatus: z
    .enum(["pending", "permitted", "restricted", "denied"])
    .default("pending"),
  commercialUseAllowed: z.boolean().default(false),
  reproductionAllowed: z.boolean().default(false),
  derivativesAllowed: z.boolean().default(false),
  licenseDocument: z.string().max(6000).default(""),
  attributionRequired: z.string().max(1000).default(""),
});
export type Rights = z.infer<typeof documentSchema> & {
  verifiedAt?: Date | string | null;
  licenseId?: string | null;
};
export function canReproduce(doc: Rights) {
  return (
    doc.rightsStatus === "permitted" &&
    doc.commercialUseAllowed &&
    doc.reproductionAllowed &&
    !!doc.licenseDocument &&
    !!doc.verifiedAt &&
    !!doc.licenseId
  );
}
export const examSchema = z.object({
  institutionId: z.string().min(1).max(100),
  title: z.string().trim().min(3).max(200),
  year: z.number().int().min(1970).max(2100),
  phase: z.string().trim().min(1).max(100),
  edition: z.string().trim().min(1).max(100),
  booklet: z.string().trim().min(1).max(100),
  day: z.string().max(60).default(""),
  language: z.string().max(60).default(""),
  questionCount: z.number().int().min(1).max(300),
  firstNumber: z.number().int().min(1).max(900).default(1),
  durationMinutes: z.number().int().min(1).max(600),
  allowPause: z.boolean(),
  document: documentSchema,
  keyDocument: documentSchema,
  items: z.array(itemSchema).min(1).max(300),
});
export type ExamDraft = z.infer<typeof examSchema>;
export type ExamSnapshot = Omit<ExamDraft, "document" | "keyDocument">;

export function validateKey(exam: ExamSnapshot) {
  const errors: string[] = [];
  const numbers = new Set(exam.items.map((q) => q.number));
  if (
    exam.items.length !== exam.questionCount ||
    numbers.size !== exam.questionCount
  )
    errors.push("Quantidade ou numeração duplicada no gabarito.");
  for (
    let i = exam.firstNumber;
    i < exam.firstNumber + exam.questionCount;
    i++
  ) {
    if (!numbers.has(i)) errors.push(`Questão ${i} ausente.`);
  }
  for (const q of exam.items) {
    if (
      !q.annulled &&
      (q.format === "written"
        ? !q.correct.trim()
        : !optionsFor(q.format).includes(q.correct))
    )
      errors.push(`Confira a resposta da questão ${q.number}.`);
    if (!q.annulled && (!q.explanation.trim() || !q.explanationReviewed))
      errors.push(`A explicação da questão ${q.number} precisa de revisão.`);
  }
  return errors;
}

export function validateAnswer(item: ExamItemData, value: string) {
  if (
    value.length > 16000 ||
    (value &&
      item.format !== "written" &&
      !optionsFor(item.format).includes(value))
  )
    throw new ExamError(`Resposta inválida para a questão ${item.number}.`);
}

export function grade(items: ExamItemData[], answers: StudentAnswer[]) {
  const byNumber = new Map(answers.map((a) => [a.number, a.value.trim()]));
  const rows = items.map((q) => {
    const answer = byNumber.get(q.number) || "";
    const status = q.annulled
      ? "annulled"
      : !answer
        ? "unanswered"
        : q.format === "written"
          ? "pending"
          : answer === q.correct
            ? "correct"
            : "wrong";
    return {
      number: q.number,
      subject: q.subject,
      answer,
      correct: q.correct,
      status,
      explanation: q.explanationReviewed ? q.explanation : "",
      format: q.format,
    };
  });
  const count = (status: string) =>
    rows.filter((row) => row.status === status).length;
  const correct = count("correct"),
    wrong = count("wrong"),
    unanswered = count("unanswered"),
    annulled = count("annulled"),
    pending = count("pending");
  const objectiveCount = items.filter(
    (q) => q.format !== "written" && !q.annulled,
  ).length;
  const subjects = [...new Set(items.map((q) => q.subject))].map((subject) => ({
    subject,
    correct: rows.filter((r) => r.subject === subject && r.status === "correct")
      .length,
    total: items.filter(
      (q) => q.subject === subject && !q.annulled && q.format !== "written",
    ).length,
  }));
  return {
    correct,
    wrong,
    unanswered,
    annulled,
    pending,
    objectiveCount,
    percentage: objectiveCount
      ? Math.round((correct / objectiveCount) * 1000) / 10
      : null,
    subjects,
    rows,
  };
}

export function elapsedSeconds(
  attempt: { elapsedSeconds: number; activeSince: Date | null },
  now = new Date(),
) {
  return (
    attempt.elapsedSeconds +
    (attempt.activeSince
      ? Math.max(
          0,
          Math.floor((now.getTime() - attempt.activeSince.getTime()) / 1000),
        )
      : 0)
  );
}

export function publicItems(items: ExamItemData[]) {
  return items.map(({ number, format, subject, topic, regions }) => ({
    number,
    format,
    subject,
    topic,
    regions,
  }));
}
