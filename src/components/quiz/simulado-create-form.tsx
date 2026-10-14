"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { OwlGenerating } from "@/components/mascot/owl-mascot";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readApiJson } from "@/lib/client-response";
import { getSubjectColor } from "@/lib/subjects";
import { useMountedRef } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

type FileOption = { id: string; name: string; processed: boolean };

/** Tamanhos de simulado oferecidos; só aparecem os que cabem no plano. */
const SIZES = [10, 20, 45, 90];

/** Matérias agrupadas pelas áreas do ENEM (os nomes são os que o gerador e o banco de questões entendem). */
const AREAS: Array<{ name: string; subjects: Array<{ value: string; label: string }> }> = [
  {
    name: "Linguagens",
    subjects: [
      { value: "Portugues", label: "Português" },
      { value: "Literatura", label: "Literatura" },
      { value: "Ingles", label: "Inglês" },
      { value: "Espanhol", label: "Espanhol" },
      { value: "Artes", label: "Artes" },
    ],
  },
  {
    name: "Ciências Humanas",
    subjects: [
      { value: "Historia", label: "História" },
      { value: "Geografia", label: "Geografia" },
      { value: "Filosofia", label: "Filosofia" },
      { value: "Sociologia", label: "Sociologia" },
    ],
  },
  {
    name: "Ciências da Natureza",
    subjects: [
      { value: "Biologia", label: "Biologia" },
      { value: "Quimica", label: "Química" },
      { value: "Fisica", label: "Física" },
    ],
  },
  { name: "Matemática", subjects: [{ value: "Matematica", label: "Matemática" }] },
];

type Source = "provas" | "ia";

export function SimuladoCreateForm({ files = [], maxQuestions = 20 }: { files?: FileOption[]; maxQuestions?: number }) {
  const sizes = SIZES.filter((size) => size <= maxQuestions);
  const mounted = useMountedRef();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<Source>("provas");
  const [subjects, setSubjects] = useState<string[]>(["Matematica", "Portugues", "Biologia", "Historia"]);
  const [count, setCount] = useState(sizes.includes(20) ? 20 : (sizes[sizes.length - 1] ?? 10));
  const [fileId, setFileId] = useState("none");
  const readyFiles = files.filter((file) => file.processed);
  // Material próprio só existe na geração por IA (o banco não tem o conteúdo do aluno).
  const material = source === "ia" ? readyFiles.find((file) => file.id === fileId) : undefined;

  function toggleSubject(value: string) {
    setSubjects((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleArea(values: string[]) {
    setSubjects((current) => {
      const all = values.every((value) => current.includes(value));
      return all ? current.filter((item) => !values.includes(item)) : [...new Set([...current, ...values])];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!material && !subjects.length) {
      toast.message("Escolha pelo menos uma matéria.");
      return;
    }
    // Com material escolhido, o simulado sai do conteúdo dele (PDF, foto ou vídeo).
    const subject = material ? material.name.slice(0, 280) : subjects.join(", ");
    setLoading(true);
    let response: Response;
    try {
      response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: material ? undefined : `Simulado de ${subject}, com questoes contextualizadas e nivel de prova`,
          fileId: material?.id,
          subject,
          difficulty: "simulado",
          questionCount: count,
          source: material ? "ia" : source,
        }),
      });
    } catch {
      if (mounted.current) {
        setLoading(false);
        toast.error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      }
      return;
    }
    const data = await readApiJson<{ quizId?: string; error?: string }>(response, "Não foi possível montar o simulado.");
    if (!mounted.current) return;
    setLoading(false);

    if (!response.ok || !data.quizId) {
      toast.error(data.error ?? "Não foi possível montar o simulado.");
      return;
    }

    toast.success("Simulado pronto.");
    router.push(`/dashboard/simulados/${data.quizId}`);
    router.refresh();
  }

  const sourceButton = (value: Source, icon: React.ReactNode, title: string, detail: string) => (
    <button
      type="button"
      onClick={() => setSource(value)}
      aria-pressed={source === value}
      className={cn(
        "flex flex-1 items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors",
        source === value ? "border-brand bg-brand-tint" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <span className={cn("mt-0.5 grid size-8 flex-none place-items-center rounded-lg", source === value ? "bg-brand text-on-brand" : "bg-surface-muted text-ink-muted")}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-xs text-ink-muted">{detail}</span>
      </span>
    </button>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4 shadow-card lg:p-5">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-ink">Como montar</legend>
        <div className="flex flex-col gap-2 sm:flex-row">
          {sourceButton("provas", <Zap className="size-4" aria-hidden="true" />, "Questões de provas", "Sai na hora, com questões que já caíram no ENEM e gabarito oficial.")}
          {sourceButton("ia", <Sparkles className="size-4" aria-hidden="true" />, "Gerado pela IA", "Questões novas ou do seu material. Leva alguns minutos.")}
        </div>
      </fieldset>

      {source === "ia" && readyFiles.length ? (
        <div className="w-full sm:max-w-sm">
          <label className="text-sm font-semibold text-ink">Material</label>
          <div className="mt-1">
            <Select value={fileId} onValueChange={(value) => value && setFileId(value)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem material (por matéria)</SelectItem>
                {readyFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>{file.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {material ? null : (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold text-ink">
            Áreas e matérias <span className="font-normal text-ink-muted">({subjects.length} {subjects.length === 1 ? "escolhida" : "escolhidas"})</span>
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            {AREAS.map((area) => {
              const values = area.subjects.map((item) => item.value);
              const all = values.every((value) => subjects.includes(value));
              return (
                <div key={area.name} className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
                  <button
                    type="button"
                    onClick={() => toggleArea(values)}
                    aria-pressed={all}
                    className="flex items-center justify-between gap-2 text-left text-sm font-bold text-ink"
                  >
                    {area.name}
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", all ? "bg-brand text-on-brand" : "bg-surface-muted text-ink-muted")}>
                      {all ? "Toda a área" : "Marcar área"}
                    </span>
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {area.subjects.map((item) => {
                      const on = subjects.includes(item.value);
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => toggleSubject(item.value)}
                          aria-pressed={on}
                          className={cn(
                            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                            on ? "border-brand bg-brand-tint text-brand-strong" : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
                          )}
                        >
                          {on ? <Check className="size-3.5" aria-hidden="true" /> : <span className="size-2 rounded-full" style={{ backgroundColor: getSubjectColor(item.value) }} aria-hidden="true" />}
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold text-ink">Questões</legend>
          <div className="inline-flex rounded-xl border border-border bg-background p-1">
            {(sizes.length ? sizes : [10]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setCount(size)}
                aria-pressed={count === size}
                className={cn("min-h-9 min-w-12 rounded-lg px-3 text-sm font-semibold transition-colors", count === size ? "bg-brand text-on-brand" : "text-ink-muted hover:text-ink")}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={loading} className="min-h-11 gap-2 rounded-lg bg-brand px-6 text-on-brand hover:bg-brand-strong">
          <ClipboardCheck className="size-4" aria-hidden="true" />
          {loading ? (source === "provas" && !material ? "Montando..." : "Gerando...") : "Novo simulado"}
        </Button>
      </div>

      {loading ? (
        <OwlGenerating
          message={source === "provas" && !material ? "Separando as questões das provas..." : "Montando o simulado e conferindo o gabarito. Simulados grandes levam alguns minutos."}
        />
      ) : null}
    </form>
  );
}
