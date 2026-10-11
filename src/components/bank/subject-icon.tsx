import { Atom, BookOpen, Brain, Calculator, Cpu, Dna, Dumbbell, Feather, FlaskConical, Globe2, Landmark, Languages, Layers, Palette, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícone e cor de cada matéria do banco (slug). */
const SUBJECTS: Record<string, { icon: LucideIcon; tone: string }> = {
  "lingua-portuguesa": { icon: BookOpen, tone: "bg-[#e0f2fe] text-[#0369a1] dark:bg-[#0c2a3f] dark:text-[#7dd3fc]" },
  literatura: { icon: Feather, tone: "bg-[#fce7f3] text-[#be185d] dark:bg-[#3b0d26] dark:text-[#f9a8d4]" },
  ingles: { icon: Languages, tone: "bg-[#ede9fe] text-[#6d28d9] dark:bg-[#24123f] dark:text-[#c4b5fd]" },
  espanhol: { icon: Languages, tone: "bg-[#ffedd5] text-[#c2410c] dark:bg-[#3a1a07] dark:text-[#fdba74]" },
  artes: { icon: Palette, tone: "bg-[#fae8ff] text-[#a21caf] dark:bg-[#33103a] dark:text-[#f0abfc]" },
  "educacao-fisica": { icon: Dumbbell, tone: "bg-[#dcfce7] text-[#15803d] dark:bg-[#0f2a1b] dark:text-[#86efac]" },
  "tecnologias-da-informacao": { icon: Cpu, tone: "bg-[#e0e7ff] text-[#4338ca] dark:bg-[#18183f] dark:text-[#a5b4fc]" },
  historia: { icon: Landmark, tone: "bg-[#fef3c7] text-[#b45309] dark:bg-[#33260a] dark:text-[#fcd34d]" },
  geografia: { icon: Globe2, tone: "bg-[#ccfbf1] text-[#0f766e] dark:bg-[#082b28] dark:text-[#5eead4]" },
  filosofia: { icon: Brain, tone: "bg-[#f3e8ff] text-[#7e22ce] dark:bg-[#2a1240] dark:text-[#d8b4fe]" },
  sociologia: { icon: Users, tone: "bg-[#fee2e2] text-[#b91c1c] dark:bg-[#3a1416] dark:text-[#fca5a5]" },
  fisica: { icon: Atom, tone: "bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#0f1e3d] dark:text-[#93c5fd]" },
  quimica: { icon: FlaskConical, tone: "bg-[#d1fae5] text-[#047857] dark:bg-[#062b20] dark:text-[#6ee7b7]" },
  biologia: { icon: Dna, tone: "bg-[#ecfccb] text-[#4d7c0f] dark:bg-[#1c2a07] dark:text-[#bef264]" },
  matematica: { icon: Calculator, tone: "bg-[#fee2e2] text-[#be123c] dark:bg-[#3a1220] dark:text-[#fda4af]" },
};

export function SubjectIcon({ slug, className, size = 20 }: { slug: string | null; className?: string; size?: number }) {
  const item = (slug && SUBJECTS[slug]) || { icon: Layers, tone: "bg-brand-tint text-brand-strong" };
  const Icon = item.icon;
  return (
    <span className={cn("grid flex-none place-items-center rounded-xl", item.tone, className)} aria-hidden="true">
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}
