import { notFound } from "next/navigation";
import { AttemptRunner } from "@/components/past-exams/attempt-runner";
import { getAttempt } from "@/lib/past-exams/service";
import { ExamError } from "@/lib/past-exams/domain";
import { getStudentOrRedirect } from "@/lib/server-user";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await getStudentOrRedirect();
  let attempt;
  try { attempt = await getAttempt((await params).id,user.id); }
  catch (e) { if (e instanceof ExamError && e.status===404) notFound(); throw e; }
  return <AttemptRunner initial={attempt} />;
}
