"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Plus, Save, Trash2, Upload } from "lucide-react";
import {
  documentSchema,
  optionsFor,
  validateKey,
  type ExamDraft,
  type ExamItemData,
  type ExamSnapshot,
} from "@/lib/past-exams/domain";
import type { ImportedAnswer } from "@/lib/past-exams/import-key";
import styles from "./exams.module.css";
type Document = ExamDraft["document"] & {
  id: string;
  kind: string;
  storagePath: string | null;
  pageCount: number | null;
};
type ManagedExam = {
  id: string;
  version: number;
  status: string;
  title: string;
  documents: Document[];
  institution: { name: string };
  keys: {
    id: string;
    status: string;
    revision: number;
    snapshot: ExamSnapshot;
  }[];
};
const rights = () => documentSchema.parse({ sourceUrl: "https://example.org" });
const emptyItem = (
  number: number,
  format: ExamItemData["format"] = "mcq5",
): ExamItemData => ({
  number,
  format,
  subject: "Conhecimentos gerais",
  topic: "",
  regions: [],
  sourceUrl: "",
  correct: "",
  annulled: false,
  explanation: "",
  explanationReviewed: false,
});
const emptyDraft = (institutionId: string): ExamDraft => ({
  institutionId,
  title: "",
  year: new Date().getFullYear() - 1,
  phase: "1ª fase",
  edition: "Regular",
  booklet: "",
  day: "",
  language: "",
  questionCount: 1,
  firstNumber: 1,
  durationMinutes: 300,
  allowPause: true,
  document: { ...rights(), sourceUrl: "" },
  keyDocument: { ...rights(), sourceUrl: "" },
  items: [emptyItem(1)],
});

export function ExamManager() {
  const [institutions, setInstitutions] = useState<
      { id: string; name: string; archiveUrl: string | null }[]
    >([]),
    [exams, setExams] = useState<ManagedExam[]>([]),
    [selected, setSelected] = useState<ManagedExam | null>(null),
    [draft, setDraft] = useState<ExamDraft | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [review, setReview] = useState(false),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState<{
      rows: ImportedAnswer[];
      text: string;
    } | null>(null);
  const load = useCallback(async () => {
    const res = await fetch("/api/internal/past-exams", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setInstitutions(data.institutions);
    setExams(data.exams);
    return data.exams as ManagedExam[];
  }, []);
  useEffect(() => {
    // Initial data comes from the authenticated admin endpoint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((e) => setError(String(e)));
  }, [load]);
  function edit(exam: ManagedExam) {
    setSelected(exam);
    const snapshot = exam.keys[0]?.snapshot;
    if (!snapshot) {
      setError("Prova sem rascunho de gabarito.");
      return;
    }
    setDraft({
      ...snapshot,
      document: exam.documents.find((d) => d.kind === "exam")!,
      keyDocument: exam.documents.find((d) => d.kind === "key")!,
    });
    setReview(false);
    setDirty(false);
    setError("");
    setMessage("");
    setPreview(null);
  }
  function change(patch: Partial<ExamDraft>) {
    setDraft((old) => (old ? { ...old, ...patch } : old));
    setDirty(true);
    setReview(false);
  }
  function itemChange(index: number, patch: Partial<ExamItemData>) {
    if (!draft) return;
    change({
      items: draft.items.map((q, i) =>
        i === index
          ? {
              ...q,
              ...patch,
              ...("explanation" in patch ? { explanationReviewed: false } : {}),
            }
          : q,
      ),
    });
  }
  async function request(body: unknown) {
    const res = await fetch("/api/internal/past-exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não foi possível salvar.");
    return data;
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const data = await request({
        action: "save",
        id: selected?.id,
        version: selected?.version,
        exam: draft,
      });
      const updated = await load();
      edit(updated.find((e) => e.id === data.id)!);
      setMessage("Rascunho salvo. Confira o gabarito antes de publicar.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await request({
        action: "publish",
        id: selected.id,
        keyId: selected.keys[0].id,
        version: selected.version,
        confirm: review,
      });
      const updated = await load();
      edit(updated.find((e) => e.id === selected.id)!);
      setMessage("Prova publicada com gabarito revisado.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("examId", selected?.id ?? "");
      const res = await fetch("/api/internal/past-exams/import", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File, doc: Document) {
    setBusy(true);
    setError("");
    try {
      if (file.size > 25_000_000) throw new Error("Máximo de 25 MB.");
      const post = async (body: unknown) => {
        const r = await fetch("/api/internal/past-exams/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      };
      const signed = await post({ action: "upload", documentId: doc.id });
      const sent = await fetch(signed.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!sent.ok) throw new Error("Falha ao enviar PDF.");
      await post({ action: "complete", documentId: doc.id, path: signed.path });
      const updated = await load();
      setSelected(updated.find((e) => e.id === selected?.id) ?? null);
      setMessage("PDF validado e armazenado com acesso privado.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const problems = draft ? validateKey(draft) : [];
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            className="text-xs text-[var(--brand)]"
            href="/dashboard/provas/cadernos"
          >
            Cadernos de prova
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Gerenciar provas</h1>
        </div>
        <button
          className={styles.button}
          disabled={!institutions.length || busy}
          onClick={() => {
            if (dirty && !window.confirm("Descartar alterações não salvas?"))
              return;
            setSelected(null);
            setDraft(emptyDraft(institutions[0].id));
            setDirty(true);
            setReview(false);
            setError("");
            setMessage("");
          }}
        >
          <Plus size={16} />
          Nova prova
        </button>
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.notice}>
          {message}
        </p>
      )}
      <label className={`${styles.field} mb-6`}>
        Prova
        <select
          className={styles.input}
          value={selected?.id ?? ""}
          onChange={(e) => {
            if (dirty && !window.confirm("Descartar alterações não salvas?"))
              return;
            const exam = exams.find((x) => x.id === e.target.value);
            if (exam) edit(exam);
          }}
        >
          <option value="">Selecione ou cadastre uma prova</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.institution.name} · {e.title} ·{" "}
              {e.status === "published" ? "Publicada" : "Rascunho"}
            </option>
          ))}
        </select>
      </label>
      {draft && (
        <>
          <section className={styles.section}>
            <h2>Identificação do caderno</h2>
            <div className={styles.fields}>
              <label className={styles.field}>
                Instituição
                <select
                  className={styles.input}
                  value={draft.institutionId}
                  onChange={(e) => change({ institutionId: e.target.value })}
                >
                  {institutions.map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ["title", "Nome da prova"],
                  ["phase", "Fase"],
                  ["edition", "Edição"],
                  ["booklet", "Caderno / versão / cor"],
                  ["day", "Dia"],
                  ["language", "Língua estrangeira"],
                ] as const
              ).map(([field, label]) => (
                <label className={styles.field} key={field}>
                  {label}
                  <input
                    className={styles.input}
                    value={draft[field]}
                    onChange={(e) => change({ [field]: e.target.value })}
                  />
                </label>
              ))}
              {(
                [
                  ["year", "Ano"],
                  ["durationMinutes", "Duração (min)"],
                  ["firstNumber", "Primeira questão"],
                  ["questionCount", "Quantidade"],
                ] as const
              ).map(([field, label]) => (
                <label className={styles.field} key={field}>
                  {label}
                  <input
                    className={styles.input}
                    type="number"
                    value={draft[field]}
                    onChange={(e) =>
                      change({ [field]: Number(e.target.value) })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.allowPause}
                onChange={(e) => change({ allowPause: e.target.checked })}
              />
              Permitir pausa
            </label>
          </section>
          {(
            [
              ["document", "Prova original", "exam"],
              ["keyDocument", "Gabarito oficial", "key"],
            ] as const
          ).map(([field, label, kind]) => {
            const doc = draft[field];
            const stored = selected?.documents.find((d) => d.kind === kind);
            return (
              <section className={styles.section} key={field}>
                <h2>{label}</h2>
                <label className={styles.field}>
                  Link direto oficial
                  <input
                    className={styles.input}
                    type="url"
                    value={doc.sourceUrl}
                    onChange={(e) =>
                      change({ [field]: { ...doc, sourceUrl: e.target.value } })
                    }
                  />
                </label>
                <div className={`${styles.fields} mt-4`}>
                  <label className={styles.field}>
                    Direitos de reprodução
                    <select
                      className={styles.input}
                      value={doc.rightsStatus}
                      onChange={(e) =>
                        change({
                          [field]: { ...doc, rightsStatus: e.target.value },
                        })
                      }
                    >
                      <option value="pending">Aguardando autorização</option>
                      <option value="permitted">Permitida com evidência</option>
                      <option value="restricted">Restrita</option>
                      <option value="denied">Negada</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    Atribuição exigida
                    <input
                      className={styles.input}
                      value={doc.attributionRequired ?? ""}
                      onChange={(e) =>
                        change({
                          [field]: {
                            ...doc,
                            attributionRequired: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <label className={`${styles.field} mt-4`}>
                  Autorização / documento comprobatório
                  <textarea
                    className={styles.input}
                    rows={2}
                    value={doc.licenseDocument ?? ""}
                    onChange={(e) =>
                      change({
                        [field]: { ...doc, licenseDocument: e.target.value },
                      })
                    }
                  />
                </label>
                <div className="my-4 flex flex-wrap gap-5 text-sm">
                  {(
                    [
                      ["commercialUseAllowed", "Uso comercial"],
                      ["reproductionAllowed", "Reprodução"],
                      ["derivativesAllowed", "Derivações e recortes"],
                    ] as const
                  ).map(([flag, text]) => (
                    <label key={flag} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={doc[flag]}
                        onChange={(e) =>
                          change({
                            [field]: { ...doc, [flag]: e.target.checked },
                          })
                        }
                      />
                      {text}
                    </label>
                  ))}
                </div>
                {stored &&
                  stored.rightsStatus === "permitted" &&
                  stored.commercialUseAllowed &&
                  stored.reproductionAllowed && (
                    <label className={`${styles.button} cursor-pointer`}>
                      <Upload size={16} />
                      {stored.storagePath
                        ? `Substituir PDF (${stored.pageCount} páginas)`
                        : "Importar PDF autorizado"}
                      <input
                        hidden
                        type="file"
                        accept="application/pdf"
                        disabled={busy || dirty}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void upload(f, stored);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                {doc.sourceUrl && (
                  <a
                    className="ml-3 inline-flex items-center gap-1 text-xs text-[var(--brand)]"
                    href={doc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    Fonte
                  </a>
                )}
              </section>
            );
          })}
          <section className={styles.section}>
            <h2>
              Questões e gabarito{" "}
              {selected ? `· revisão ${selected.keys[0]?.revision}` : ""}
            </h2>
            <div className="mb-5 flex flex-wrap gap-3">
              <button
                className={styles.button}
                disabled={draft.questionCount < 1 || draft.questionCount > 300}
                onClick={() =>
                  change({
                    items: Array.from(
                      { length: draft.questionCount },
                      (_, i) =>
                        draft.items.find(
                          (q) => q.number === draft.firstNumber + i,
                        ) ?? emptyItem(draft.firstNumber + i),
                    ),
                  })
                }
              >
                <Plus size={16} />
                Aplicar numeração
              </button>
              <label className={`${styles.button} cursor-pointer`}>
                <Upload size={16} />
                Importar gabarito
                <input
                  type="file"
                  hidden
                  accept=".csv,.xlsx,.pdf"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <a
                href="/api/internal/past-exams/template"
                className={styles.button}
              >
                Modelo CSV
              </a>
            </div>
            {preview && (
              <div className="mb-6 border-y border-[var(--border)] py-4">
                <h3 className="font-semibold">
                  Prévia importada · {preview.rows.length} respostas
                </h3>
                <p className="my-3 text-xs text-[var(--warning)]">
                  Ainda não validada. Confira a fase, a cor e a numeração do
                  caderno.
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                  {preview.rows
                    .map(
                      (r) =>
                        `${r.number}: ${r.annulled ? "ANULADA" : r.correct}`,
                    )
                    .join("   ") ||
                    preview.text ||
                    "Nenhuma resposta identificada."}
                </pre>
                {preview.text && (
                  <details className="my-3">
                    <summary className="text-sm">Texto extraído do PDF</summary>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                      {preview.text}
                    </pre>
                  </details>
                )}
                <button
                  className={`${styles.button} mt-3`}
                  disabled={!preview.rows.length}
                  onClick={() => {
                    const expected = new Set(draft.items.map((q) => q.number));
                    if (preview.rows.some((r) => !expected.has(r.number))) {
                      setError("O arquivo contém números fora deste caderno.");
                      return;
                    }
                    change({
                      items: draft.items.map((q) => {
                        const r = preview.rows.find(
                          (r) => r.number === q.number,
                        );
                        return r
                          ? {
                              ...q,
                              correct: r.correct,
                              annulled: r.annulled,
                              explanationReviewed: false,
                            }
                          : q;
                      }),
                    });
                    setPreview(null);
                  }}
                >
                  <Check size={16} />
                  Aplicar ao rascunho
                </button>
              </div>
            )}
            <div>
              {draft.items.map((q, index) => (
                <details
                  key={q.number}
                  className="border-b border-[var(--border)] py-3"
                >
                  <summary className="cursor-pointer text-sm">
                    {q.number}. {q.subject} ·{" "}
                    {q.annulled ? "Anulada" : q.correct || "Sem gabarito"}
                    {!q.annulled && (!q.explanation || !q.explanationReviewed)
                      ? " · Revisão pendente"
                      : ""}
                  </summary>
                  <div className={`${styles.fields} mt-4`}>
                    <label className={styles.field}>
                      Formato
                      <select
                        className={styles.input}
                        value={q.format}
                        onChange={(e) =>
                          itemChange(index, {
                            format: e.target.value as ExamItemData["format"],
                            correct: "",
                          })
                        }
                      >
                        <option value="mcq5">5 alternativas</option>
                        <option value="mcq4">4 alternativas</option>
                        <option value="boolean">Certo / errado</option>
                        <option value="written">Discursiva</option>
                      </select>
                    </label>
                    <label className={styles.field}>
                      Disciplina
                      <input
                        className={styles.input}
                        value={q.subject}
                        onChange={(e) =>
                          itemChange(index, { subject: e.target.value })
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      Assunto
                      <input
                        className={styles.input}
                        value={q.topic}
                        onChange={(e) =>
                          itemChange(index, { topic: e.target.value })
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      Fonte da questão
                      <input
                        type="url"
                        className={styles.input}
                        value={q.sourceUrl}
                        onChange={(e) =>
                          itemChange(index, { sourceUrl: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className={`${styles.field} mt-4`}>
                    {q.format === "written"
                      ? "Resposta esperada"
                      : "Alternativa correta"}
                    {q.format === "written" ? (
                      <textarea
                        className={styles.input}
                        value={q.correct}
                        onChange={(e) =>
                          itemChange(index, { correct: e.target.value })
                        }
                      />
                    ) : (
                      <select
                        className={styles.input}
                        value={q.correct}
                        onChange={(e) =>
                          itemChange(index, { correct: e.target.value })
                        }
                      >
                        <option value="">Selecione</option>
                        {optionsFor(q.format).map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label className="my-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={q.annulled}
                      onChange={(e) =>
                        itemChange(index, { annulled: e.target.checked })
                      }
                    />
                    Questão anulada no gabarito definitivo
                  </label>
                  <label className={styles.field}>
                    Explicação autoral / revisada
                    <textarea
                      rows={4}
                      className={styles.input}
                      value={q.explanation}
                      onChange={(e) =>
                        itemChange(index, { explanation: e.target.value })
                      }
                    />
                  </label>
                  <label className="my-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={q.explanationReviewed}
                      onChange={(e) =>
                        itemChange(index, {
                          explanationReviewed: e.target.checked,
                        })
                      }
                    />
                    Explicação conferida
                  </label>
                  <h4 className="my-3 text-sm font-medium">
                    Páginas e regiões (coordenadas de 0 a 1)
                  </h4>
                  {q.regions.map((r, ri) => (
                    <div
                      key={ri}
                      className="mb-3 flex flex-wrap items-end gap-2"
                    >
                      {(
                        [
                          ["page", "Página"],
                          ["x", "X"],
                          ["y", "Y"],
                          ["width", "Largura"],
                          ["height", "Altura"],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className={styles.field}
                          style={{ width: 80 }}
                        >
                          {label}
                          <input
                            className={styles.input}
                            type="number"
                            step={key === "page" ? 1 : 0.01}
                            min={key === "page" ? 1 : 0}
                            max={key === "page" ? 2000 : 1}
                            value={r[key]}
                            onChange={(e) =>
                              itemChange(index, {
                                regions: q.regions.map((old, j) =>
                                  j === ri
                                    ? { ...old, [key]: Number(e.target.value) }
                                    : old,
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                      <button
                        className={`${styles.button} ${styles.icon}`}
                        title="Remover região"
                        aria-label="Remover região"
                        onClick={() =>
                          itemChange(index, {
                            regions: q.regions.filter((_, j) => j !== ri),
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className={styles.button}
                    onClick={() =>
                      itemChange(index, {
                        regions: [
                          ...q.regions,
                          { page: 1, x: 0, y: 0, width: 1, height: 1 },
                        ],
                      })
                    }
                  >
                    <Plus size={16} />
                    Adicionar página / região
                  </button>
                </details>
              ))}
            </div>
          </section>
          <section className={styles.section}>
            <h2>Revisão e publicação</h2>
            {problems.length > 0 && (
              <p className="mb-4 text-sm text-[var(--warning)]">
                {problems.length} pendências: {problems.slice(0, 3).join(" ")}
              </p>
            )}
            <label className="mb-5 flex items-start gap-3 text-sm leading-6">
              <input
                className="mt-1"
                type="checkbox"
                checked={review}
                disabled={dirty || !selected || problems.length > 0}
                onChange={(e) => setReview(e.target.checked)}
              />
              Conferi o ano, a fase, a versão/cor, a quantidade, as respostas,
              anulações, retificações e explicações contra as fontes oficiais.
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className={styles.button}
                disabled={busy}
                onClick={() => void save()}
              >
                <Save size={16} />
                {busy ? "Aguarde…" : "Salvar rascunho"}
              </button>
              <button
                className={`${styles.button} ${styles.primary}`}
                disabled={
                  busy ||
                  dirty ||
                  !review ||
                  problems.length > 0 ||
                  selected?.status === "published"
                }
                onClick={() => void publish()}
              >
                <Check size={16} />
                Publicar revisão
              </button>
              {selected?.status === "published" && (
                <button
                  className={styles.button}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await request({
                        action: "unpublish",
                        id: selected.id,
                        version: selected.version,
                      });
                      const updated = await load();
                      edit(updated.find((e) => e.id === selected.id)!);
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Retirar do catálogo
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
