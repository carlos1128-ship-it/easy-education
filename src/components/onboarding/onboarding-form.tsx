"use client";

import { useMemo, useState } from "react";
import { OnboardingDone, type OnboardingSummary } from "@/components/onboarding/onboarding-done";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarCheck, Clock, Compass, Layers, Plus, Sparkles } from "lucide-react";
import { SubjectChecklist } from "@/components/subjects/subject-fields";
import { toast } from "sonner";
import { Button } from "@/components/auth/legacy-ui/button";
import { Input } from "@/components/auth/legacy-ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/auth/legacy-ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { DEFAULT_SELECTED_SUBJECTS, getSubjectColor, SUBJECTS } from "@/lib/subjects";
import {
  CHALLENGES,
  DEPTHS,
  ENTRANCE_EXAMS,
  EXAM_BOARDS,
  EXPLANATION_STYLES,
  goalLabel,
  INTEREST_OPTIONS,
  isEnemStudent,
  LANGUAGE_EXAMS,
  LANGUAGE_LEVELS,
  LANGUAGE_SKILLS,
  LANGUAGES,
  PERIODS,
  PRACTICE_PREFERENCES,
  PURPOSES,
  SCHOOL_YEARS,
  SEMESTERS,
  STUDY_METHODS,
  WEEKDAYS,
  type Personalization,
  type PurposeId,
} from "@/lib/learner-profile";

const levels = [
  { value: "Iniciante", hint: "Estou começando o conteúdo" },
  { value: "Intermediário", hint: "Já vi boa parte do conteúdo" },
  { value: "Avançado", hint: "Quero treinar no nível da prova" },
];
type StepId = "purpose" | "details" | "routine" | "subjects" | "learning";
const MAX_METHODS = 3;
const EVIDENCE_LABEL: Record<string, string> = { alta: "Mais eficaz", moderada: "Eficaz", foco: "Ajuda no foco", baixa: "Use junto com questões" };

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Matérias sugeridas quando o aluno escolhe o motivo do estudo. */
function defaultSubjectsFor(purpose: PurposeId): Record<string, number> {
  if (purpose === "escola" || purpose === "enem_vestibular") return DEFAULT_SELECTED_SUBJECTS;
  if (purpose === "idioma") return { "Leitura (Reading)": 3, Gramática: 3, Vocabulário: 3, "Compreensão auditiva (Listening)": 3 };
  if (purpose === "concurso") return { Portugues: 3, Matematica: 3 };
  return {};
}

const selectedCard = "border-[#1B4FD8] bg-[#EFF4FF] dark:bg-[#131D35]";
const hintText = "mt-1 text-xs text-slate-500 dark:text-[#94A3B8]";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", active ? selectedCard : "border-slate-200 dark:border-[#1A2744]")}
    >
      {children}
    </button>
  );
}

function OptionSelect({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return (
    <Select value={value || null} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item} value={item}>{item}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type OnboardingInitial = {
  personalization: Personalization | null;
  targetDate: string;
  level: string;
  dailyMinutes: number;
  studyMethod: string;
  subjects: Record<string, number>;
};

export function OnboardingForm({ initial, redo = false }: { initial?: OnboardingInitial; redo?: boolean }) {
  const router = useRouter();
  const start = initial?.personalization;
  const [step, setStep] = useState(0);
  const [purpose, setPurpose] = useState<PurposeId | null>(start?.purpose ?? null);
  const [details, setDetails] = useState<Partial<Personalization>>(start ?? {});
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [level, setLevel] = useState(initial?.level ?? "Iniciante");
  const [dailyMinutes, setDailyMinutes] = useState(initial?.dailyMinutes ?? 120);
  const [studyDays, setStudyDays] = useState<string[]>(start?.studyDays ?? WEEKDAYS.map((day) => day.value));
  const [selectedSubjects, setSelectedSubjects] = useState<Record<string, number>>(initial?.subjects ?? DEFAULT_SELECTED_SUBJECTS);
  const [customSubjects, setCustomSubjects] = useState<string[]>(
    Object.keys(initial?.subjects ?? {}).filter((name) => !SUBJECTS.some((item) => item.name === name) && !LANGUAGE_SKILLS.some((item) => item.name === name)),
  );
  const [newSubject, setNewSubject] = useState("");
  const [methodsChosen, setMethodsChosen] = useState<string[]>(() => {
    const saved = (initial?.studyMethod ?? "").split(",").map((item) => item.trim()).filter((item) => STUDY_METHODS.some((m) => m.value === item));
    return saved.length ? saved : ["Questões e simulados", "Revisão espaçada"];
  });
  // Temas de quem estuda por conta própria: caixinhas + "Outros" com texto livre.
  const savedInterests = (start?.interests ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const [interestChips, setInterestChips] = useState<string[]>(savedInterests.filter((item) => (INTEREST_OPTIONS as readonly string[]).includes(item)));
  const [otherInterest, setOtherInterest] = useState(savedInterests.filter((item) => !(INTEREST_OPTIONS as readonly string[]).includes(item)).join(", "));
  const [otherOpen, setOtherOpen] = useState(Boolean(otherInterest));
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<OnboardingSummary | null>(null);

  // Quem estuda por conta própria escolhe os temas na etapa 2: não repete a etapa de matérias.
  const steps: StepId[] = purpose === "conhecimento" ? ["purpose", "details", "routine", "learning"] : ["purpose", "details", "routine", "subjects", "learning"];
  const stepId = steps[Math.min(step, steps.length - 1)];
  const progress = ((step + 1) / steps.length) * 100;
  const StepIcon = { purpose: Compass, details: BookOpen, routine: Clock, subjects: Layers, learning: Sparkles }[stepId] ?? CalendarCheck;
  const interestList = [...interestChips, ...otherInterest.split(",").map((item) => item.trim()).filter(Boolean)].slice(0, 12);

  const set = <K extends keyof Personalization>(key: K, value: Personalization[K]) => setDetails((current) => ({ ...current, [key]: value }));
  const toggleIn = (key: "challenges" | "studyDays", value: string) => {
    if (key === "studyDays") {
      setStudyDays((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
      return;
    }
    const current = details.challenges ?? [];
    set("challenges", current.includes(value) ? current.filter((item) => item !== value) : [...current, value].slice(0, 9));
  };

  const subjectOptions = useMemo(() => {
    const base = purpose === "idioma" ? LANGUAGE_SKILLS : SUBJECTS;
    return [...customSubjects.map((name) => ({ name, color: getSubjectColor(name) })), ...base];
  }, [purpose, customSubjects]);

  const subjectPayload = useMemo(
    () => Object.entries(selectedSubjects).map(([name, difficulty]) => ({ name, difficulty })),
    [selectedSubjects],
  );

  function choosePurpose(next: PurposeId) {
    if (next !== purpose) {
      setDetails({ ...details, purpose: next, exam: undefined, schoolYear: undefined, course: undefined, board: undefined, role: undefined, language: undefined, languageLevel: undefined });
      setSelectedSubjects(defaultSubjectsFor(next));
    }
    setPurpose(next);
    setStep(0);
  }

  function addSubject() {
    const name = newSubject.trim().slice(0, 60);
    if (!name) return;
    if (!customSubjects.includes(name)) setCustomSubjects((current) => [name, ...current]);
    setSelectedSubjects((current) => ({ ...current, [name]: 3 }));
    setNewSubject("");
  }

  /** Validação mínima por etapa, sem travar quem não sabe responder tudo. */
  function canContinue() {
    if (stepId === "purpose") return Boolean(purpose);
    if (stepId === "details" && purpose === "idioma") return Boolean(details.language);
    if (stepId === "details" && purpose === "conhecimento") return interestList.length > 0;
    if (stepId === "routine") return studyDays.length > 0;
    if (stepId === "subjects") return subjectPayload.length > 0;
    if (stepId === "learning") return methodsChosen.length > 0;
    return true;
  }

  async function finish() {
    if (!purpose) return;
    setSaving(true);
    const personalization: Personalization = {
      ...details,
      purpose,
      studyDays,
      ...(purpose === "conhecimento" ? { interests: interestList.join(", ").slice(0, 400) } : {}),
    } as Personalization;
    // Por conta própria: os temas escolhidos viram as matérias do plano.
    const subjects = purpose === "conhecimento" ? interestList.map((name) => ({ name: name.slice(0, 80), difficulty: 3 })) : subjectPayload;
    const levelValue = purpose === "idioma" && details.languageLevel ? `${details.languageLevel} (QECR)` : level;
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goalLabel(personalization),
          targetDate: targetDate || undefined,
          level: levelValue,
          dailyMinutes,
          studyMethod: methodsChosen.join(", "),
          subjects,
          personalization,
          regeneratePlan: redo,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "Não foi possível criar seu plano. Tente de novo.");
        setSaving(false);
        return;
      }
    } catch {
      toast.error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
      setSaving(false);
      return;
    }

    toast.success(redo ? "Personalização atualizada e plano refeito." : "Seu plano de estudos está pronto.");
    // Mostra o resumo do que foi configurado e oferece o simulado diagnóstico, em vez de ir direto ao painel.
    setDone({
      goal: goalLabel(personalization),
      targetDate,
      level: levelValue,
      dailyMinutes,
      methods: methodsChosen,
      subjects: subjects.map((item) => item.name),
      enem: isEnemStudent(personalization),
    });
    setSaving(false);
    router.refresh();
  }

  const showExamDate = purpose !== "conhecimento";

  if (done) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-[#1A2744] bg-white p-6 shadow-sm">
        <OnboardingDone summary={done} redo={redo} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#1A2744] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[#EFF4FF] dark:bg-[#131D35] p-2 text-[#1B4FD8] dark:text-[#93C5FD]">
          <StepIcon className="size-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">Etapa {step + 1} de {steps.length}</p>
          <Progress value={progress} className="mt-2 h-2" />
        </div>
      </div>

      {stepId === "purpose" ? (
        <div className="space-y-3">
          <Label>Por que você está estudando?</Label>
          <p className={hintText}>Isso muda o estilo das questões, o tom das explicações e o seu plano.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PURPOSES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={purpose === item.id}
                onClick={() => choosePurpose(item.id)}
                className={cn("rounded-lg border p-4 text-left", purpose === item.id && selectedCard)}
              >
                <p className="font-medium">{item.label}</p>
                <p className={hintText}>{item.hint}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {stepId === "details" ? (
        <div className="space-y-5">
          {purpose === "escola" ? (
            <div className="space-y-2">
              <Label>Em que série você está?</Label>
              <OptionSelect value={details.schoolYear ?? ""} onChange={(value) => set("schoolYear", value)} options={SCHOOL_YEARS} placeholder="Escolha a série" />
            </div>
          ) : null}

          {purpose === "enem_vestibular" ? (
            <>
              <div className="space-y-2">
                <Label>Qual prova você vai fazer?</Label>
                <OptionSelect value={details.exam ?? ""} onChange={(value) => set("exam", value)} options={ENTRANCE_EXAMS} placeholder="ENEM, Fuvest, Unicamp..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Curso que você quer</Label>
                  <Input value={details.course ?? ""} onChange={(event) => set("course", event.target.value)} placeholder="Ex.: Medicina, Direito, Engenharia" />
                </div>
                <div className="space-y-2">
                  <Label>Em que série você está?</Label>
                  <OptionSelect value={details.schoolYear ?? ""} onChange={(value) => set("schoolYear", value)} options={SCHOOL_YEARS.slice(4)} placeholder="Escolha" />
                </div>
              </div>
            </>
          ) : null}

          {purpose === "concurso" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Concurso ou cargo</Label>
                <Input value={details.role ?? ""} onChange={(event) => set("role", event.target.value)} placeholder="Ex.: INSS técnico, Polícia Federal" />
              </div>
              <div className="space-y-2">
                <Label>Banca</Label>
                <OptionSelect value={details.board ?? ""} onChange={(value) => set("board", value)} options={EXAM_BOARDS} placeholder="Cebraspe, FGV, FCC..." />
              </div>
            </div>
          ) : null}

          {purpose === "faculdade" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Seu curso</Label>
                <Input value={details.course ?? ""} onChange={(event) => set("course", event.target.value)} placeholder="Ex.: Enfermagem, Administração" />
              </div>
              <div className="space-y-2">
                <Label>Em que período você está?</Label>
                <OptionSelect value={details.semester ?? ""} onChange={(value) => set("semester", value)} options={SEMESTERS} placeholder="Escolha" />
              </div>
            </div>
          ) : null}

          {purpose === "idioma" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Qual idioma?</Label>
                  <OptionSelect value={details.language ?? ""} onChange={(value) => set("language", value)} options={LANGUAGES} placeholder="Inglês, Espanhol..." />
                </div>
                <div className="space-y-2">
                  <Label>Prova de proficiência</Label>
                  <OptionSelect value={details.exam ?? ""} onChange={(value) => set("exam", value)} options={LANGUAGE_EXAMS} placeholder="IELTS, TOEFL, DELE..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Para onde você quer ir? (opcional)</Label>
                <Input value={details.destination ?? ""} onChange={(event) => set("destination", event.target.value)} placeholder="Ex.: Canadá, intercâmbio de 6 meses" />
              </div>
            </>
          ) : null}

          {purpose === "certificacao" ? (
            <div className="space-y-2">
              <Label>Qual prova ou certificação?</Label>
              <Input value={details.exam ?? ""} onChange={(event) => set("exam", event.target.value)} placeholder="Ex.: OAB 1ª fase, CFC, AWS Cloud Practitioner, CPA-20" />
            </div>
          ) : null}

          {purpose === "conhecimento" ? (
            <>
              <div className="space-y-2">
                <Label>O que você quer aprender? (marque quantos quiser)</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((item) => (
                    <Chip
                      key={item}
                      active={interestChips.includes(item)}
                      onClick={() => setInterestChips((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]))}
                    >
                      {item}
                    </Chip>
                  ))}
                  <Chip active={otherOpen} onClick={() => setOtherOpen((value) => !value)}>Outros</Chip>
                </div>
                {otherOpen ? (
                  <Input
                    value={otherInterest}
                    onChange={(event) => setOtherInterest(event.target.value)}
                    placeholder="Escreva o tema (separe por vírgula se forem vários)"
                    autoFocus
                  />
                ) : null}
              </div>
              <div>
                <Label>Quanto você já sabe?</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {DEPTHS.map((item) => (
                    <button key={item.value} type="button" aria-pressed={details.depth === item.value} onClick={() => set("depth", item.value)} className={cn("rounded-lg border p-4 text-left", details.depth === item.value && selectedCard)}>
                      <p className="font-medium">{item.label}</p>
                      <p className={hintText}>{item.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {showExamDate ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data da prova (opcional)</Label>
                <Input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sua meta (opcional)</Label>
                <Input
                  value={details.targetScore ?? ""}
                  onChange={(event) => set("targetScore", event.target.value)}
                  placeholder={purpose === "idioma" ? "Ex.: IELTS 7.0, nível B2" : purpose === "escola" ? "Ex.: média 8, sair da recuperação" : "Ex.: 750 no ENEM, passar na 1ª fase"}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {stepId === "routine" ? (
        <div className="space-y-6">
          {purpose === "idioma" ? (
            <div>
              <Label>Seu nível no idioma hoje</Label>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {LANGUAGE_LEVELS.map((item) => (
                  <button key={item.value} type="button" aria-pressed={details.languageLevel === item.value} onClick={() => set("languageLevel", item.value)} className={cn("rounded-lg border p-3 text-left", details.languageLevel === item.value && selectedCard)}>
                    <p className="font-medium">{item.value}</p>
                    <p className={hintText}>{item.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <Label>Como você se considera no conteúdo?</Label>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {levels.map((item) => (
                  <button className={cn("rounded-lg border p-4 text-left", level === item.value && selectedCard)} key={item.value} onClick={() => setLevel(item.value)} type="button" aria-pressed={level === item.value}>
                    <p className="font-medium">{item.value}</p>
                    <p className={hintText}>{item.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <Label>{formatHours(dailyMinutes)} por dia para estudar</Label>
            <Slider min={30} max={480} step={30} value={[dailyMinutes]} onValueChange={(nextValue) => {
                const value = Array.isArray(nextValue) ? nextValue[0] : nextValue;
                setDailyMinutes(value);
              }} />
          </div>
          <div className="space-y-2">
            <Label>Em quais dias você consegue estudar?</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => (
                <Chip key={day.value} active={studyDays.includes(day.value)} onClick={() => toggleIn("studyDays", day.value)}>{day.label}</Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Melhor horário</Label>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <Chip key={item.value} active={details.period === item.value} onClick={() => set("period", item.value)}>{item.label}</Chip>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {stepId === "subjects" ? (
        <div className="space-y-4">
          <div>
            <Label>{purpose === "idioma" ? "Quais habilidades você quer treinar?" : "Quais matérias entram no seu estudo?"}</Label>
            <p className={hintText}>Marque e ajuste a dificuldade de cada uma (1 fácil, 5 difícil). As mais difíceis ganham mais tempo no plano.</p>
          </div>
          {purpose !== "idioma" ? (
            <div className="flex gap-2">
              <Input
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubject();
                  }
                }}
                placeholder={purpose === "faculdade" ? "Adicionar disciplina (ex.: Anatomia)" : purpose === "concurso" ? "Adicionar matéria do edital (ex.: Direito Constitucional)" : "Adicionar outra matéria ou tema"}
              />
              <Button type="button" variant="outline" onClick={addSubject} aria-label="Adicionar matéria">
                <Plus className="size-4" />
              </Button>
            </div>
          ) : null}
          <SubjectChecklist value={selectedSubjects} onChange={setSelectedSubjects} options={subjectOptions} />
        </div>
      ) : null}

      {stepId === "learning" ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>O que mais atrapalha seu estudo? (marque quantas quiser)</Label>
            <div className="flex flex-wrap gap-2">
              {CHALLENGES.map((item) => (
                <Chip key={item.value} active={(details.challenges ?? []).includes(item.value)} onClick={() => toggleIn("challenges", item.value)}>{item.label}</Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Como você gosta que expliquem?</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {EXPLANATION_STYLES.map((item) => (
                <button key={item.value} type="button" aria-pressed={details.explanationStyle === item.value} onClick={() => set("explanationStyle", item.value)} className={cn("rounded-lg border p-4 text-left", details.explanationStyle === item.value && selectedCard)}>
                  <p className="font-medium">{item.label}</p>
                  <p className={hintText}>{item.hint}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Você aprende melhor...</Label>
            <div className="flex flex-wrap gap-2">
              {PRACTICE_PREFERENCES.map((item) => (
                <Chip key={item.value} active={details.practicePreference === item.value} onClick={() => set("practicePreference", item.value)}>{item.label}</Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Métodos de estudo (escolha até {MAX_METHODS})</Label>
            <p className={hintText}>Segundo as pesquisas, testar o que você sabe e revisar com intervalos são o que mais fixa o conteúdo.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {STUDY_METHODS.map((item) => {
                const active = methodsChosen.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setMethodsChosen((current) =>
                        active ? current.filter((value) => value !== item.value) : current.length >= MAX_METHODS ? current : [...current, item.value],
                      )
                    }
                    className={cn("rounded-lg border p-4 text-left", active && selectedCard)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.value}</p>
                      <span
                        className={cn(
                          "whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
                          item.evidence === "alta" ? "bg-[#DCFCE7] text-[#166534] dark:bg-[#0F2A1B] dark:text-[#86EFAC]" : "bg-slate-100 text-slate-600 dark:bg-[#131D35] dark:text-[#94A3B8]",
                        )}
                      >
                        {EVIDENCE_LABEL[item.evidence]}
                      </span>
                    </div>
                    <p className={hintText}>{item.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex justify-between">
        <Button disabled={step === 0 || saving} variant="outline" onClick={() => setStep((value) => value - 1)}>
          Voltar
        </Button>
        <Button
          className="bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]"
          disabled={saving || !canContinue()}
          onClick={step === steps.length - 1 ? finish : () => setStep((value) => value + 1)}
        >
          {step === steps.length - 1 ? (saving ? "Montando seu plano…" : redo ? "Salvar e refazer meu plano" : "Criar meu plano") : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
