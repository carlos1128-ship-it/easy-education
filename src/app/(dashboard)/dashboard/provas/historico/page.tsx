import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { getStudentOrRedirect } from "@/lib/server-user";
import type { grade, ExamSnapshot } from "@/lib/past-exams/domain";
import styles from "@/components/past-exams/exams.module.css";
export default async function Page() {
  const { user } = await getStudentOrRedirect();
  const attempts = await getPrisma().examAttempt.findMany({ where:{userId:user.id}, orderBy:{startedAt:"desc"}, take:100, include:{key:{select:{snapshot:true}}} });
  return <div className="mx-auto max-w-5xl"><Link href="/dashboard/provas/cadernos" className="text-sm text-[var(--brand)]">Cadernos de prova</Link><h1 className="my-6 text-2xl font-semibold">Meu histórico</h1>{!attempts.length ? <p className="text-sm text-[var(--ink-muted)]">Você ainda não iniciou nenhum caderno.</p> : <div className="overflow-auto"><table className={styles.table}><thead><tr><th>Prova</th><th>Início</th><th>Status</th><th>Acertos</th><th/></tr></thead><tbody>{attempts.map((a)=>{const snapshot=a.key.snapshot as unknown as ExamSnapshot;const result=a.result as ReturnType<typeof grade>|null;return <tr key={a.id}><td className="min-w-48 font-medium">{snapshot.title}<p className={styles.muted}>{snapshot.booklet} · {snapshot.phase}</p></td><td>{a.startedAt.toLocaleDateString("pt-BR",{timeZone:"America/Sao_Paulo"})}</td><td>{a.status==="finished"?"Finalizada":a.status==="paused"?"Pausada":"Em andamento"}</td><td>{result?.percentage != null ? `${result.percentage}%` : "—"}</td><td><Link className={styles.button} href={`/dashboard/provas/tentativas/${a.id}`}>{a.status==="finished"?"Resultado":"Retomar"}</Link></td></tr>;})}</tbody></table></div>}</div>;
}
