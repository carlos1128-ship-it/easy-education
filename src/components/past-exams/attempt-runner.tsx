"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Flag,
  Pause,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import type { AttemptView } from "@/lib/past-exams/service";
import { optionsFor, type StudentAnswer } from "@/lib/past-exams/domain";
import { PdfViewer } from "./pdf-viewer";
import styles from "./exams.module.css";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
export function AttemptRunner({ initial }: { initial: AttemptView }) {
  const [view, setView] = useState(initial),
    [answers, setAnswers] = useState<Record<number, StudentAnswer>>(
      Object.fromEntries(initial.answers.map((a) => [a.number, a])),
    );
  const [tab, setTab] = useState("document"),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("Respostas salvas"),
    [busy, setBusy] = useState(false),
    [actionBusy, setActionBusy] = useState(false),
    [remaining, setRemaining] = useState(
      initial.durationMinutes * 60 - initial.elapsedSeconds,
    ),
    [conflict, setConflict] = useState(false);
  const current = useRef(initial),
    dirty = useRef(new Map<number, StudentAnswer>()),
    sending = useRef(false),
    transitioning = useRef(false),
    blocked = useRef(false),
    serverClock = useRef(0),
    dialog = useRef<HTMLDialogElement>(null);
  const storageKey = `easy:exam:${initial.id}`;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  const persist = useCallback(() => {
    try {
      if (dirty.current.size)
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: current.current.version,
            answers: [...dirty.current.values()],
          }),
        );
      else localStorage.removeItem(storageKey);
    } catch {
      setSaved("Sem cópia local; mantenha esta aba aberta até salvar.");
    }
  }, [storageKey]);

  const sync = useCallback(
    async (action: "save" | "pause" | "resume" | "finish" = "save") => {
      if (
        sending.current ||
        blocked.current ||
        current.current.status === "finished"
      )
        return;
      if (action === "save" && !dirty.current.size) return;
      sending.current = true;
      transitioning.current = action !== "save";
      setActionBusy(action !== "save");
      setBusy(true);
      setSaved("Salvando…");
      const pending = [...dirty.current.values()];
      try {
        const response = await fetch(`/api/past-exams/attempts/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version: current.current.version,
            action,
            answers: pending,
          }),
          signal: AbortSignal.timeout(20000),
        });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 409) {
            blocked.current = true;
            setConflict(true);
          }
          throw new Error(result.error || "Não foi possível salvar.");
        }
        for (const answer of pending)
          if (dirty.current.get(answer.number) === answer)
            dirty.current.delete(answer.number);
        current.current = result;
        serverClock.current = Date.now();
        setView(result);
        setError("");
        setSaved(
          dirty.current.size ? "Salvamento pendente" : "Respostas salvas",
        );
        persist();
        if (result.status === "finished") {
          dirty.current.clear();
          persist();
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Sem conexão. As respostas aguardam envio.",
        );
        setSaved("Salvamento pendente");
        persist();
      } finally {
        sending.current = false;
        transitioning.current = false;
        setActionBusy(false);
        setBusy(false);
      }
    },
    [initial.id, persist],
  );

  useEffect(() => {
    serverClock.current = Date.now();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && initial.status !== "finished") {
        const cached = JSON.parse(raw) as {
          version: number;
          answers: StudentAnswer[];
        };
        if (
          cached.version === initial.version &&
          Array.isArray(cached.answers)
        ) {
          dirty.current = new Map(cached.answers.map((a) => [a.number, a]));
          // Browser-only recovery is intentionally hydrated after SSR.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAnswers((old) => ({
            ...old,
            ...Object.fromEntries(cached.answers.map((a) => [a.number, a])),
          }));
          setSaved("Recuperando respostas locais…");
        } else {
          setError(
            "Há respostas locais de uma versão antiga. Confira a versão salva antes de continuar.",
          );
          blocked.current = true;
          setConflict(true);
        }
      }
    } catch {
      setError("Não foi possível recuperar a cópia local.");
    }
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    const interval = window.setInterval(() => {
      const active = current.current.status === "active";
      const time = Math.max(
        0,
        current.current.durationMinutes * 60 -
          current.current.elapsedSeconds -
          (active ? Math.floor((Date.now() - serverClock.current) / 1000) : 0),
      );
      setRemaining(time);
      if (active && time === 0) void sync("finish");
      else if (active) void sync();
    }, 1500);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [storageKey, initial.status, initial.version, sync]);

  function change(
    number: number,
    value: string,
    reviewed = answers[number]?.reviewed ?? false,
  ) {
    if (view.status !== "active" || blocked.current || transitioning.current) return;
    const answer = { number, value, reviewed };
    dirty.current.set(number, answer);
    setAnswers((old) => ({ ...old, [number]: answer }));
    setSaved("Salvamento pendente");
    persist();
  }
  const answered = Object.values(answers).filter((a) => a.value.trim()).length;
  const result = view.result;
  return (
    <div className={styles.workspace}>
      <header className={styles.bar}>
        <Link
          href="/dashboard/provas/cadernos"
          className={`${styles.button} ${styles.icon}`}
          aria-label="Voltar às provas"
          title="Voltar às provas"
          onClick={(e) => {
            if (
              dirty.current.size &&
              !window.confirm(
                "Há respostas ainda não salvas no servidor. Sair mesmo assim?",
              )
            )
              e.preventDefault();
          }}
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1>{view.title}</h1>
          <p className={styles.muted}>
            {view.year} · {view.phase} · {view.booklet}
            {view.day ? ` · ${view.day}` : ""}
            {view.language ? ` · ${view.language}` : ""}
            {view.isDemo ? " · Questões próprias" : ""}
          </p>
        </div>
        <span
          className="font-mono text-sm tabular-nums"
          aria-label="Tempo restante"
        >
          {clock(remaining)}
        </span>
        {!result && (
          <>
            <button
              className={`${styles.button} ${styles.icon}`}
              title={view.status === "paused" ? "Retomar" : "Pausar"}
              aria-label={view.status === "paused" ? "Retomar" : "Pausar"}
              disabled={busy || conflict || !view.allowPause}
              onClick={() =>
                void sync(view.status === "paused" ? "resume" : "pause")
              }
            >
              {view.status === "paused" ? (
                <Play size={18} />
              ) : (
                <Pause size={18} />
              )}
            </button>
            <button
              className={`${styles.button} ${styles.primary}`}
              disabled={busy || conflict}
              onClick={() => dialog.current?.showModal()}
            >
              <Send size={16} />
              Finalizar
            </button>
          </>
        )}
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}{" "}
          {conflict ? (
            <button
              className="underline"
              onClick={() => {
                if (
                  window.confirm(
                    "Descartar a cópia local e carregar as respostas do servidor?",
                  )
                ) {
                  localStorage.removeItem(storageKey);
                  window.location.reload();
                }
              }}
            >
              Carregar versão salva
            </button>
          ) : (
            <button className="underline" onClick={() => void sync()}>
              Tentar salvar novamente
            </button>
          )}
        </div>
      )}
      {view.status === "paused" && (
        <p className={styles.notice}>
          Prova pausada. O cronômetro está parado.
        </p>
      )}
      <div className={styles.split} data-tab={tab}>
        <section className={styles.document} aria-label="Caderno de prova">
          {view.document?.internal ? (
            <PdfViewer
              documentId={view.document.id}
              page={page}
              onPageChange={setPage}
            />
          ) : (
            <div className={styles.empty}>
              <p className="mb-3 text-xs font-medium uppercase text-[var(--brand)]">
                {view.institution} / {view.year}
              </p>
              <h2 className="mb-4 text-2xl font-semibold">Caderno de prova</h2>
              <p className="mb-6 text-sm leading-7 text-[var(--ink-muted)]">
                {view.booklet} · {view.phase}. Fonte:{" "}
                {view.document
                  ? new URL(view.document.sourceUrl).hostname
                  : view.institution}
                .
              </p>
              {view.document && (
                <a
                  href={view.document.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.button} ${styles.primary}`}
                >
                  <ExternalLink size={18} />
                  Abrir prova na fonte
                </a>
              )}
            </div>
          )}
          {view.document?.attribution && (
            <p className="p-4 text-xs text-[var(--ink-muted)]">
              {view.document.attribution}
            </p>
          )}
        </section>
        <aside
          className={styles.sheet}
          aria-label={result ? "Resultado" : "Cartão-resposta"}
        >
          {result ? (
            <>
              <h2 className="text-xl font-semibold">Resultado</h2>
              <p className="my-3 text-3xl font-semibold">
                {view.mode === "self_review" ? "Treino salvo" : result.percentage === null
                  ? "Sem itens objetivos"
                  : `${result.percentage}%`}
              </p>
              {view.mode === "self_review" ? (
                <div className="space-y-3 text-sm text-ink-muted">
                  <p>Seu cartão-resposta ficou salvo. Confira suas respostas na fonte oficial. Este treino não calcula nota nem acertos sem um gabarito revisado.</p>
                  {view.keyUrl ? <a href={view.keyUrl} target="_blank" rel="noopener noreferrer" className={styles.button}><ExternalLink size={16} />Abrir gabarito oficial</a> : null}
                </div>
              ) : <p className={styles.muted}>
                Percentual de acertos nos itens objetivos válidos. Não é nota
                oficial
                {view.institutionSlug === "enem"
                  ? " nem estimativa TRI do ENEM"
                  : " da instituição"}
                . Anuladas e discursivas não entram nesse percentual.
              </p>}
              <dl className="my-5 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Acertos", result.correct],
                  ["Erros", result.wrong],
                  ["Em branco", result.unanswered],
                  ["Anuladas", result.annulled],
                  [view.mode === "self_review" ? "Respostas para conferir" : "Discursivas respondidas", result.pending],
                ].filter(([label]) => view.mode !== "self_review" || !["Acertos", "Erros", "Anuladas"].includes(String(label))).map(([label, value]) => (
                  <div key={label}>
                    <dt className={styles.muted}>{label}</dt>
                    <dd className="text-lg font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              {view.mode !== "self_review" ? <h3 className="mb-3 font-medium">Por disciplina</h3> : null}
              {(view.mode === "self_review" ? [] : result.subjects).map((s) => (
                <p
                  key={s.subject}
                  className="flex justify-between gap-3 border-b border-[var(--border)] py-2 text-sm"
                >
                  <span>{s.subject}</span>
                  <span>
                    {s.correct}/{s.total}
                  </span>
                </p>
              ))}
              <p className="mt-4 text-xs text-[var(--ink-muted)]">
                {view.isDemo
                  ? "Respostas do exemplo autoral"
                  : view.mode === "self_review" ? "Conferência pela fonte oficial" : "Gabarito revisado"}{" "}
                · versão {view.keyRevision}
              </p>
              {result.rows.map((row) => (
                <article key={row.number} className={styles.answer}>
                  <h3 className="font-medium">
                    {row.number}.{" "}
                    {
                      (
                        {
                          correct: "Correta",
                          wrong: "Incorreta",
                          unanswered: "Em branco",
                          annulled: "Anulada",
                          pending: view.mode === "self_review" ? "Confira no gabarito oficial" : "Discursiva: compare com o padrão",
                        } as Record<string, string>
                      )[row.status]
                    }
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    Sua resposta: {row.answer || "Não respondida"}
                  </p>
                  {row.status !== "annulled" && row.correct && (
                    <p className="mt-2 whitespace-pre-wrap text-sm">
                      {row.format === "written"
                        ? "Resposta esperada"
                        : "Gabarito"}
                      : {row.correct}
                    </p>
                  )}
                  {row.explanation && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-muted)]">
                      {row.explanation}
                    </p>
                  )}
                </article>
              ))}
              <Link
                href="/dashboard/provas/historico"
                className={`${styles.button} mt-5`}
              >
                Meu histórico
              </Link>
            </>
          ) : (
            <>
              <div className={styles.sheetHeader}>
                <h2 className="font-semibold">Cartão-resposta</h2>
                <div className="my-2 flex justify-between text-xs">
                  <span>
                    {answered} de {view.items.length} respondidas
                  </span>
                  <span aria-live="polite" className={styles.muted}>
                    {saved}
                  </span>
                </div>
                <progress
                  className="h-1 w-full accent-[var(--brand)]"
                  value={answered}
                  max={view.items.length}
                />
              </div>
              <div className={styles.questionGrid}>
                {view.items.map((q) => (
                  <button
                    key={q.number}
                    className={styles.number}
                    data-answered={!!answers[q.number]?.value}
                    data-reviewed={answers[q.number]?.reviewed}
                    title={`Questão ${q.number}${answers[q.number]?.reviewed ? ", revisada" : ""}`}
                    onClick={() =>
                      document
                        .getElementById(`answer-${q.number}`)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    {q.number}
                  </button>
                ))}
              </div>
              <select
                className={styles.input}
                aria-label="Filtrar questões"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Todas as questões</option>
                <option value="unanswered">Não respondidas</option>
                <option value="reviewed">Revisadas</option>
              </select>
              {view.items
                .filter(
                  (q) =>
                    filter === "all" ||
                    (filter === "unanswered"
                      ? !answers[q.number]?.value
                      : answers[q.number]?.reviewed),
                )
                .map((q) => (
                  <section
                    id={`answer-${q.number}`}
                    key={q.number}
                    className={styles.answer}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="text-left text-sm font-semibold"
                        title="Ver página da questão"
                        onClick={() => {
                          setPage(q.regions[0]?.page || 1);
                          setTab("document");
                        }}
                      >
                        {q.number}.{" "}
                        <span className="font-normal">{q.subject}</span>
                      </button>
                      <button
                        className={`${styles.button} ${styles.icon}`}
                        disabled={view.status !== "active" || conflict || actionBusy}
                        title={
                          answers[q.number]?.reviewed
                            ? "Marcar como não revisada"
                            : "Marcar como revisada"
                        }
                        aria-label={`Revisada: questão ${q.number}`}
                        aria-pressed={answers[q.number]?.reviewed ?? false}
                        onClick={() =>
                          change(
                            q.number,
                            answers[q.number]?.value ?? "",
                            !answers[q.number]?.reviewed,
                          )
                        }
                      >
                        {answers[q.number]?.reviewed ? (
                          <Check size={16} className="text-[var(--success)]" />
                        ) : (
                          <Flag size={16} />
                        )}
                      </button>
                    </div>
                    {q.format === "written" ? (
                      <textarea
                        className={`${styles.input} mt-3 min-h-32`}
                        aria-label={`Resposta da questão ${q.number}`}
                        disabled={view.status !== "active" || conflict || actionBusy}
                        maxLength={16000}
                        value={answers[q.number]?.value ?? ""}
                        onChange={(e) => change(q.number, e.target.value)}
                      />
                    ) : (
                      <div className={styles.choices}>
                        {optionsFor(q.format).map((choice) => (
                          <button
                            key={choice}
                            className={styles.choice}
                            disabled={view.status !== "active" || conflict || actionBusy}
                            aria-label={`Questão ${q.number}: ${q.format === "boolean" ? (choice === "C" ? "Certo" : "Errado") : choice}`}
                            aria-pressed={answers[q.number]?.value === choice}
                            onClick={() => change(q.number, choice)}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    )}
                    {!!answers[q.number]?.value && (
                      <button
                        disabled={view.status !== "active" || conflict || actionBusy}
                        className="mt-2 flex items-center gap-1 text-xs text-[var(--ink-muted)]"
                        onClick={() => change(q.number, "")}
                      >
                        <RotateCcw size={12} />
                        Limpar resposta
                      </button>
                    )}
                  </section>
                ))}
            </>
          )}
        </aside>
      </div>
      <nav className={styles.tabs} aria-label="Painéis da prova">
        <button
          aria-pressed={tab === "document"}
          onClick={() => setTab("document")}
        >
          Caderno
        </button>
        <button
          aria-pressed={tab === "answers"}
          onClick={() => setTab("answers")}
        >
          {result
            ? "Resultado"
            : `Respostas (${answered}/${view.items.length})`}
        </button>
      </nav>
      <dialog ref={dialog} className={styles.dialog}>
        <h2 className="text-lg font-semibold">Finalizar prova?</h2>
        <p className="my-4 text-sm text-[var(--ink-muted)]">
          {view.items.length - answered} questões sem resposta. Após finalizar,
          as respostas não poderão ser alteradas.
        </p>
        <div className="flex justify-end gap-3">
          <button
            className={styles.button}
            onClick={() => dialog.current?.close()}
          >
            Continuar
          </button>
          <button
            className={`${styles.button} ${styles.primary}`}
            disabled={busy}
            onClick={() => {
              dialog.current?.close();
              setTab("answers");
              void sync("finish");
            }}
          >
            Finalizar
          </button>
        </div>
      </dialog>
    </div>
  );
}
