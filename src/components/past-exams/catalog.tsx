"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, History, Loader2, Settings2 } from "lucide-react";
import { OwlMascot } from "@/components/mascot/owl-mascot";
import type { getCatalog } from "@/lib/past-exams/service";
import { isPublicExamPdf } from "@/lib/past-exams/public-document";
import covers from "@/lib/past-exams/covers.json";
import styles from "./exams.module.css";

const coverMap = covers as Record<string, { cover: string; pages: number }>;
const order = ["enem", "fuvest", "unesp", "unicamp", "etec", "fatec", "ita"];
export function ExamCatalog({ institutions, admin }: { institutions: Awaited<ReturnType<typeof getCatalog>>; admin: boolean }) {
  const router = useRouter();
  const sorted = [...institutions].sort((a, b) => (order.indexOf(a.slug) < 0 ? 99 : order.indexOf(a.slug)) - (order.indexOf(b.slug) < 0 ? 99 : order.indexOf(b.slug)));
  const [institution, setInstitution] = useState(sorted[0]?.id ?? "");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const selected = sorted.find((item) => item.id === institution);
  const years = [...new Set(selected?.exams.map((exam) => exam.year))].sort((a, b) => b - a);
  async function start(id: string) {
    setBusy(id); setError("");
    try {
      const key = `easy:exam-start:${id}`;
      const requestId = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, requestId);
      const response = await fetch("/api/past-exams/attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId: id, requestId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.removeItem(key);
      router.push(`/dashboard/provas/tentativas/${data.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível abrir a prova."); setBusy(""); }
  }
  return <div className={styles.library}>
    <aside className={styles.institutions} aria-label="Instituições">
      <div className={styles.railHeading}><BookOpen size={19} /><span>Provas anteriores</span></div>
      <div className={styles.institutionList}>
        {sorted.map((item, index) => <button key={item.id} className={styles.institution} data-selected={institution === item.id} aria-pressed={institution === item.id} onClick={() => { setInstitution(item.id); setYear(""); }}>
          <span className={styles.institutionMark} data-color={index % 5}>{item.name.slice(0, 2)}</span>
          <span>{item.name}</span><ArrowRight size={16} className="ml-auto shrink-0" />
        </button>)}
      </div>
      <Link href="/dashboard/provas/historico" className={styles.historyLink}><History size={17} />Meu histórico</Link>
    </aside>
    <main className={styles.libraryContent}>
      <header className={styles.libraryHero}>
        <div><p className="text-xs font-bold uppercase tracking-widest text-brand">Seu próximo passo</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Pratique no ritmo da prova.</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">Escolha um ano, abra o caderno e responda aqui mesmo. Seu progresso fica salvo para continuar depois.</p>
        </div><OwlMascot mood="escolar" size={140} className={styles.heroOwl} />
      </header>
      <div className={styles.catalogHeading}>
        <div><p className="text-xs text-ink-muted">Cadernos completos</p><h2 className="mt-1 text-2xl font-bold">{selected?.name}</h2></div>
        <div className="flex items-center gap-2">
          {admin && <Link href="/dashboard/interno/provas" className={styles.button} aria-label="Gerenciar provas"><Settings2 size={17} /></Link>}
          <select aria-label="Filtrar por ano" className={styles.input} value={year} onChange={(event) => setYear(event.target.value)}><option value="">Todos os anos</option>{years.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!years.length && <div className={styles.catalogEmpty}><BookOpen size={32} /><h3>Novos cadernos em preparação</h3><p>Escolha outra instituição para começar uma prova disponível.</p></div>}
      {years.filter((value) => !year || value === Number(year)).map((value) => <section key={value} className={styles.yearGroup}>
        <h3 className={styles.yearHeading}><CalendarDays size={20} />{value}</h3>
        <div className={styles.paperGrid}>{selected?.exams.filter((exam) => exam.year === value).map((exam) => {
          const doc = exam.documents.find((document) => document.kind === "exam");
          const cover = doc ? coverMap[doc.sourceUrl] : undefined;
          const available = !!doc && (!!doc.storagePath || isPublicExamPdf(doc.sourceUrl));
          const attempt = exam.attempts[0];
          const completed = attempt?.status === "finished";
          const percent = completed ? 100 : Math.round((attempt?.answers.length ?? 0) / exam.questionCount * 100);
          return <article key={exam.id} className={styles.paperCard}>
            <div className={styles.paperCover}>{cover ? <Image src={cover.cover} alt={`Capa da prova ${exam.title}`} width={130} height={184} /> : <div className={styles.coverPlaceholder}><BookOpen size={28} /><strong>{selected.name}</strong><span>{exam.year}</span></div>}</div>
            <div className={styles.paperInfo}>
              <h4>{selected.name} · {exam.phase}</h4>
              <div className={styles.paperTags}>{[exam.day, exam.booklet !== "Único" && exam.booklet !== "Versão a conferir" ? exam.booklet : "", exam.language].filter(Boolean).map((label) => <span key={label}>{label}</span>)}</div>
              <p className={styles.paperDuration}><Clock3 size={13} />{Math.floor(exam.durationMinutes / 60)}h{exam.durationMinutes % 60 ? `${exam.durationMinutes % 60}min` : ""}</p>
              <div className={styles.paperProgress}><progress aria-label="Progresso da prova" value={percent} max={100} /><span>{completed ? <CheckCircle2 size={16} /> : `${percent}%`}</span></div>
              {available ? <button className={styles.openPaper} disabled={!!busy} onClick={() => attempt ? router.push(`/dashboard/provas/tentativas/${attempt.id}`) : void start(exam.id)}>{busy === exam.id ? <Loader2 size={16} className="animate-spin" /> : completed ? "Ver prova concluída" : attempt ? "Continuar prova" : "Ver prova"}<ArrowRight size={16} /></button> : <p className="mt-3 text-xs text-ink-muted">Caderno em preparação</p>}
              {completed && <button className="mt-2 text-xs text-ink-muted underline" disabled={!!busy} onClick={() => void start(exam.id)}>Fazer novamente</button>}
            </div>
          </article>;
        })}</div>
      </section>)}
      <Link href="/dashboard/materias" className={styles.historyLink}>Prefere praticar por assunto? <ArrowRight size={16} /></Link>
    </main>
  </div>;
}
