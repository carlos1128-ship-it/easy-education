import { ExamCatalog } from "@/components/past-exams/catalog";
import { getCatalog } from "@/lib/past-exams/service";
import { getStudentOrRedirect } from "@/lib/server-user";
import { isAdminEmail } from "@/lib/admin";
export const metadata = { title: "Cadernos de prova · Easy Education" };
export default async function Page() {
  const { user } = await getStudentOrRedirect();
  return <ExamCatalog institutions={await getCatalog()} admin={isAdminEmail(user.email)} />;
}
