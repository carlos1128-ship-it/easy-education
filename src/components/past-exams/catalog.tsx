"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, History, Play, Settings2 } from "lucide-react";
import type { getCatalog } from "@/lib/past-exams/service";
import styles from "./exams.module.css";
export function ExamCatalog({
  institutions,
  admin,
}: {
  institutions: Awaited<ReturnType<typeof getCatalog>>;
  admin: boolean;
}) {
  const router = useRouter();
  const [institution, setInstitution] = useState(""),
    [year, setYear] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const years = [
    ...new Set(institutions.flatMap((i) => i.exams.map((e) => e.year))),
  ].sort((a, b) => b - a);
  async function start(id: string) {
    setBusy(id);
    setError("");
    try {
      const key = `easy:exam-start:${id}`;
      const requestId = sessionStorage.getItem(key) || crypto.randomUUID();
      sessionStorage.setItem(key, requestId);
      const response = await fetch("/api/past-exams/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: id, requestId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.removeItem(key);
      router.push(`/dashboard/provas/tentativas/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar.");
      setBusy("");
    }
  }
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/provas"
            className="text-xs text-[var(--ink-muted)]"
          >
            Provas anteriores
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Cadernos de prova</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/provas/historico" className={styles.button}>
            <History size={16} />
            Histórico
          </Link>
          {admin && (
            <Link href="/dashboard/interno/provas" className={styles.button}>
              <Settings2 size={16} />
              Gerenciar provas
            </Link>
          )}
        </div>
      </header>
      <div className={`${styles.fields} mb-6 max-w-xl`}>
        <label className={styles.field}>
          Instituição
          <select
            className={styles.input}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          >
            <option value="">Todas as instituições</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Ano
          <select
            className={styles.input}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Todos os anos</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {institutions
        .filter((i) => !institution || i.id === institution)
        .map((i) => {
          const exams = i.exams.filter((e) => !year || e.year === Number(year));
          return (
            <section key={i.id} className={styles.section}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="!mb-0">{i.name}</h2>
                {i.archiveUrl && (
                  <a
                    className="flex items-center gap-2 text-xs text-[var(--brand)]"
                    href={i.archiveUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Acervo oficial <ExternalLink size={14} />
                  </a>
                )}
              </div>
              {exams.length ? (
                <div className={styles.catalog}>
                  {exams.map((e) => (
                    <article key={e.id} className={styles.catalogItem}>
                      <p className="mb-2 text-xs text-[var(--ink-muted)]">
                        {e.year} · {e.phase}
                      </p>
                      <h3 className="text-base font-semibold">{e.title}</h3>
                      <p className="mt-2 text-xs leading-6 text-[var(--ink-muted)]">
                        {e.booklet}
                        {e.day ? ` · ${e.day}` : ""}
                        {e.language ? ` · ${e.language}` : ""}
                        <br />
                        {e.questionCount} questões · {e.durationMinutes} min
                      </p>
                      {e.isDemo && (
                        <p className="mt-3 text-xs text-[var(--warning)]">
                          Demonstração autoral. Não é prova oficial.
                        </p>
                      )}
                      {e.status === "published" ? (
                        <button
                          className={`${styles.button} ${styles.primary} mt-5 w-full`}
                          disabled={!!busy}
                          onClick={() => void start(e.id)}
                        >
                          <Play size={16} />
                          {busy === e.id ? "Abrindo…" : "Iniciar prova"}
                        </button>
                      ) : (
                        <>
                          <p className="mt-3 text-xs text-[var(--warning)]">
                            Gabarito em revisão
                          </p>
                          {e.documents[0] && (
                            <a
                              className={`${styles.button} mt-5 w-full`}
                              href={e.documents[0].sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={16} />
                              Consultar caderno
                            </a>
                          )}
                          <p className="mt-2 break-all text-xs text-[var(--ink-muted)]">
                            Fonte:{" "}
                            {e.documents[0]
                              ? new URL(e.documents[0].sourceUrl).hostname
                              : i.name}
                          </p>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-sm text-[var(--ink-muted)]">
                  Nenhum caderno com gabarito revisado disponível
                  {year ? ` em ${year}` : ""}.
                </p>
              )}
            </section>
          );
        })}
    </div>
  );
}
