import { requireAdminPage } from "@/lib/admin";
import { ExamManager } from "@/components/past-exams/exam-manager";
export const metadata = { title: "Gerenciar provas · Easy Education" };
export default async function Page() { await requireAdminPage(); return <ExamManager />; }
