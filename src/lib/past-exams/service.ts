import { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { isPublicExamPdf } from "./public-document";
import {
  canReproduce,
  elapsedSeconds,
  ExamError,
  grade,
  publicItems,
  validateAnswer,
  validateKey,
  type ExamDraft,
  type ExamSnapshot,
  type StudentAnswer,
} from "./domain";

export const attemptInclude = {
  key: true,
  exam: { include: { documents: true, institution: true } },
  answers: true,
} as const;
type Attempt = Prisma.ExamAttemptGetPayload<{ include: typeof attemptInclude }>;
const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function getCatalog(userId: string) {
  return getPrisma().examInstitution.findMany({
    where: { OR: [{ exams: { none: {} } }, { exams: { some: { isDemo: false } } }] },
    orderBy: { name: "asc" },
    include: {
      exams: {
        where: { isDemo: false, status: { in: ["published", "catalogued"] } },
        orderBy: [{ year: "desc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          year: true,
          phase: true,
          booklet: true,
          day: true,
          language: true,
          questionCount: true,
          durationMinutes: true,
          isDemo: true,
          status: true,
          attempts: {
            where: { userId }, orderBy: { startedAt: "desc" }, take: 1,
            select: { id: true, status: true, answers: { where: { value: { not: "" } }, select: { number: true } } },
          },
          documents: {
            where: { kind: { in: ["exam", "key"] } },
            orderBy: { kind: "asc" },
            select: { id: true, kind: true, sourceUrl: true, rightsStatus: true, storagePath: true },
          },
        },
      },
    },
  });
}

export async function saveDraft(
  input: ExamDraft,
  actor: string,
  id?: string,
  version?: number,
) {
  const prisma = getPrisma();
  return prisma.$transaction(
    async (tx) => {
      const { document, keyDocument, items, ...metadata } = input;
      if (id) {
        const existing = await tx.pastExam.findUnique({
          where: { id },
          include: { documents: true, _count: { select: { attempts: true } } },
        });
        if (
          existing?._count.attempts &&
          (
            [
              "institutionId",
              "year",
              "phase",
              "edition",
              "booklet",
              "day",
              "language",
            ] as const
          ).some((field) => existing[field] !== metadata[field])
        )
          throw new ExamError(
            "Este caderno já tem tentativas. Cadastre uma nova prova para mudar sua identificação.",
          );
        if (
          existing?._count.attempts &&
          existing.documents.some(
            (d) => d.kind === "exam" && d.sourceUrl !== document.sourceUrl,
          )
        )
          throw new ExamError(
            "Não substitua a prova de uma tentativa existente. Cadastre outro caderno.",
          );
        const changed = await tx.pastExam.updateMany({
          where: { id, version },
          data: {
            version: { increment: 1 },
            status: "draft",
            publishedKeyId: null,
          },
        });
        if (!changed.count)
          throw new ExamError(
            "Outra pessoa alterou esta prova. Recarregue antes de salvar.",
            409,
          );
      }
      const exam = id
        ? await tx.pastExam.update({ where: { id }, data: metadata })
        : await tx.pastExam.create({ data: metadata });
      for (const [kind, doc] of [
        ["exam", document],
        ["key", keyDocument],
      ] as const) {
        if (
          doc.rightsStatus === "permitted" &&
          (!doc.licenseDocument.trim() ||
            !doc.commercialUseAllowed ||
            !doc.reproductionAllowed)
        )
          throw new ExamError(
            "Registre a autorização comercial e de reprodução com a evidência correspondente.",
          );
        const license = doc.licenseDocument.trim()
          ? await tx.examLicense.create({
              data: { evidence: doc.licenseDocument, recordedBy: actor },
            })
          : null;
        const existing = await tx.examDocument.findUnique({
          where: { examId_kind: { examId: exam.id, kind } },
        });
        const data = {
          ...doc,
          licenseId: license?.id ?? null,
          verifiedAt: license ? new Date() : null,
          // A changed source must never keep displaying the old uploaded booklet.
          ...(existing && existing.sourceUrl !== doc.sourceUrl
            ? { storagePath: null, pageCount: null }
            : {}),
        };
        await tx.examDocument.upsert({
          where: { examId_kind: { examId: exam.id, kind } },
          create: { examId: exam.id, kind, ...data },
          update: data,
        });
      }
      await tx.examItem.deleteMany({ where: { examId: exam.id } });
      await tx.examItem.createMany({
        data: items.map(
          ({ number, format, subject, topic, regions, sourceUrl }) => ({
            examId: exam.id,
            number,
            format,
            subject,
            topic,
            regions: json(regions),
            sourceUrl,
          }),
        ),
      });
      const previous = await tx.examAnswerKey.aggregate({
        where: { examId: exam.id },
        _max: { revision: true },
      });
      const key = await tx.examAnswerKey.create({
        data: {
          examId: exam.id,
          revision: (previous._max.revision ?? 0) + 1,
          sourceUrl: keyDocument.sourceUrl,
          snapshot: json({ ...metadata, items }),
        },
      });
      return { id: exam.id, version: exam.version, keyId: key.id };
    },
    { timeout: 20000 },
  );
}

export async function publishExam(
  id: string,
  keyId: string,
  version: number,
  actor: string,
  confirm: boolean,
) {
  if (!confirm)
    throw new ExamError(
      "Confirme a revisão humana do caderno, gabarito e explicações.",
    );
  return getPrisma().$transaction(async (tx) => {
    const exam = await tx.pastExam.findUnique({
      where: { id },
      include: { documents: true },
    });
    const key = await tx.examAnswerKey.findFirst({
      where: { examId: id },
      orderBy: { revision: "desc" },
    });
    if (!exam || !key || key.id !== keyId || key.status !== "draft")
      throw new ExamError(
        "Rascunho atual não encontrado. Recarregue a prova.",
        409,
      );
    const snapshot = key.snapshot as unknown as ExamSnapshot;
    const errors = validateKey(snapshot);
    if (errors.length) throw new ExamError(errors.slice(0, 8).join(" "));
    if (
      !exam.documents.some((d) => d.kind === "exam") ||
      !exam.documents.some((d) => d.kind === "key")
    )
      throw new ExamError(
        "Cadastre as fontes oficiais da prova e do gabarito.",
      );
    const changed = await tx.pastExam.updateMany({
      where: { id, version, status: "draft" },
      data: {
        status: "published",
        publishedKeyId: key.id,
        version: { increment: 1 },
      },
    });
    if (!changed.count)
      throw new ExamError(
        "O rascunho mudou. Recarregue e confira novamente.",
        409,
      );
    await tx.examAnswerKey.update({
      where: { id: key.id },
      data: { status: "reviewed", reviewedBy: actor, reviewedAt: new Date() },
    });
    return { ok: true };
  });
}

export async function startAttempt(
  examId: string,
  userId: string,
  requestId: string,
) {
  const prisma = getPrisma();
  const previous = await prisma.examAttempt.findUnique({
    where: { userId_requestId: { userId, requestId } },
  });
  if (previous) return { id: previous.id };
  const exam = await prisma.pastExam.findFirst({
    where: { id: examId, status: { in: ["published", "catalogued"] } },
  });
  if (!exam)
    throw new ExamError("Esta prova ainda não foi revisada e publicada.", 404);
  const graded = exam.status === "published";
  const key = await prisma.examAnswerKey.findFirst({
    where: graded ? { id: exam.publishedKeyId ?? "", examId, status: "reviewed" } : { examId },
    orderBy: { revision: "desc" },
  });
  if (!key) throw new ExamError("Gabarito ainda em revisão.", 409);
  const attempt = await prisma.examAttempt.upsert({
    where: { userId_requestId: { userId, requestId } },
    update: {},
    create: { userId, examId, keyId: key.id, requestId, mode: graded ? "graded" : "self_review" },
  });
  return { id: attempt.id };
}

export function serializeAttempt(attempt: Attempt) {
  const snapshot = attempt.key.snapshot as unknown as ExamSnapshot;
  const doc = attempt.exam.documents.find((d) => d.kind === "exam");
  const finished = attempt.status === "finished";
  return {
    id: attempt.id,
    version: attempt.version,
    status: attempt.status,
    mode: attempt.mode ?? "graded",
    keyUrl: attempt.exam.documents.find((d) => d.kind === "key")?.sourceUrl ?? null,
    elapsedSeconds: Math.min(
      snapshot.durationMinutes * 60,
      elapsedSeconds(attempt),
    ),
    title: snapshot.title,
    institution: attempt.exam.institution.name,
    institutionSlug: attempt.exam.institution.slug,
    year: snapshot.year,
    phase: snapshot.phase,
    booklet: snapshot.booklet,
    day: snapshot.day,
    language: snapshot.language,
    durationMinutes: snapshot.durationMinutes,
    allowPause: snapshot.allowPause,
    isDemo: attempt.exam.isDemo,
    items: publicItems(snapshot.items),
    answers: attempt.answers.map(({ number, value, reviewed }) => ({
      number,
      value,
      reviewed,
    })),
    document: doc
      ? {
          id: doc.id,
          sourceUrl: doc.sourceUrl,
          attribution: doc.attributionRequired,
          internal: isPublicExamPdf(doc.sourceUrl) ||
            canReproduce({
              ...doc,
              rightsStatus: doc.rightsStatus as "pending",
              licenseDocument: doc.licenseDocument ?? "",
              attributionRequired: doc.attributionRequired ?? "",
            }) && !!doc.storagePath,
        }
      : null,
    keyRevision: attempt.key.revision,
    result: finished
      ? (attempt.result as ReturnType<typeof grade> | null)
      : null,
  };
}
export type AttemptView = ReturnType<typeof serializeAttempt>;

export async function getAttempt(id: string, userId: string) {
  const attempt = await getPrisma().examAttempt.findFirst({
    where: { id, userId },
    include: attemptInclude,
  });
  if (!attempt) throw new ExamError("Tentativa não encontrada.", 404);
  return serializeAttempt(attempt);
}

export async function updateAttempt(
  id: string,
  userId: string,
  version: number,
  action: "save" | "pause" | "resume" | "finish",
  answers: StudentAnswer[],
) {
  const result = await getPrisma().$transaction(
    async (tx) => {
      const attempt = await tx.examAttempt.findFirst({
        where: { id, userId },
        include: attemptInclude,
      });
      if (!attempt) throw new ExamError("Tentativa não encontrada.", 404);
      if (attempt.status === "finished") {
        if (action === "finish") return attempt;
        throw new ExamError("Esta tentativa já foi finalizada.", 409);
      }
      const snapshot = attempt.key.snapshot as unknown as ExamSnapshot;
      const elapsed = elapsedSeconds(attempt),
        expired = elapsed >= snapshot.durationMinutes * 60;
      if (action === "pause" && !snapshot.allowPause)
        throw new ExamError("Pausa indisponível nesta prova.");
      if (answers.length && attempt.status !== "active")
        throw new ExamError("Retome a prova antes de alterar respostas.");
      const changed = await tx.examAttempt.updateMany({
        where: { id, userId, version },
        data: { version: { increment: 1 } },
      });
      if (!changed.count)
        throw new ExamError(
          "Respostas alteradas em outra aba. Recarregue para continuar.",
          409,
        );
      if (!expired) {
        for (const answer of answers) {
          const item = snapshot.items.find((q) => q.number === answer.number);
          if (!item) throw new ExamError("Questão não pertence a esta prova.");
          validateAnswer(item, answer.value);
          await tx.examStudentAnswer.upsert({
            where: {
              attemptId_number: { attemptId: id, number: answer.number },
            },
            create: { attemptId: id, ...answer },
            update: answer,
          });
        }
      }
      const finish = action === "finish" || expired;
      const saved = await tx.examStudentAnswer.findMany({
        where: { attemptId: id },
      });
      return tx.examAttempt.update({
        where: { id },
        data: finish
          ? {
              status: "finished",
              finishedAt: new Date(),
              activeSince: null,
              elapsedSeconds: Math.min(elapsed, snapshot.durationMinutes * 60),
              result: json(grade(attempt.mode === "self_review" ? snapshot.items.map((item) => ({ ...item, correct: "", explanation: "", explanationReviewed: false, annulled: false })) : snapshot.items, saved)),
            }
          : action === "pause"
            ? { status: "paused", activeSince: null, elapsedSeconds: elapsed }
            : action === "resume" && attempt.status === "paused"
              ? { status: "active", activeSince: new Date() }
              : {},
        include: attemptInclude,
      });
    },
    { timeout: 20000 },
  );
  return serializeAttempt(result);
}
