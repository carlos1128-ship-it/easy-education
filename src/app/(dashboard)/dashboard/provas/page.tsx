import { ExamCatalog } from "@/components/past-exams/catalog";
import { getCatalog } from "@/lib/past-exams/service";
import { getStudentOrRedirect } from "@/lib/server-user";
import { isAdminEmail } from "@/lib/admin";

export const metadata = { title: "Provas anteriores · Easy Education" };
export const dynamic = "force-dynamic";

export default async function ProvasPage() {
  const { user } = await getStudentOrRedirect();
  return <ExamCatalog institutions={await getCatalog()} admin={isAdminEmail(user.email)} />;
}
