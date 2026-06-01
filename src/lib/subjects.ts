export const SUBJECTS = [
  { name: "ENEM", color: "#4F46E5" },
  { name: "Multidisciplinar", color: "#6366F1" },
  { name: "Matematica", color: "#6366F1" },
  { name: "Portugues", color: "#06B6D4" },
  { name: "Redacao", color: "#EC4899" },
  { name: "Biologia", color: "#22C55E" },
  { name: "Quimica", color: "#F97316" },
  { name: "Fisica", color: "#EAB308" },
  { name: "Historia", color: "#8B5CF6" },
  { name: "Geografia", color: "#14B8A6" },
  { name: "Filosofia", color: "#A855F7" },
  { name: "Sociologia", color: "#F43F5E" },
  { name: "Ingles", color: "#0EA5E9" },
  { name: "Espanhol", color: "#84CC16" },
  { name: "Literatura", color: "#D946EF" },
  { name: "Artes", color: "#F59E0B" },
  { name: "Atualidades", color: "#10B981" },
  { name: "Ciencias da Natureza", color: "#22C55E" },
  { name: "Ciencias Humanas", color: "#8B5CF6" },
] as const;

export const DEFAULT_SELECTED_SUBJECTS: Record<string, number> = {
  Matematica: 3,
  Portugues: 2,
  Redacao: 4,
  Biologia: 3,
};

export function getSubjectColor(subject: string) {
  const normalized = subject.toLowerCase();
  return SUBJECTS.find((item) => item.name.toLowerCase() === normalized)?.color ?? "#6366F1";
}

export function getProfileInitials(name?: string | null) {
  const parts = (name ?? "Aluno Easy")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (parts[0]?.[0] ?? "A") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "E");
}

export function getSubjectNames() {
  return SUBJECTS.map((subject) => subject.name);
}
