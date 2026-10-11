/** Endereços das telas de simulado de provas anteriores (ficam dentro de Simulados). */
export const SIMULADOS_HREF = "/dashboard/simulados";
export const sessionHref = (id: string) => `/dashboard/simulados/prova/${id}`;
export const resultHref = (id: string) => `/dashboard/simulados/prova/${id}/resultado`;

/** Área "Provas anteriores" (treino por exame e matéria). */
export const PROVAS_HREF = "/dashboard/provas";
export const examHref = (exam: string, subject?: string) => `/dashboard/provas/${exam}${subject ? `?materia=${encodeURIComponent(subject)}` : ""}`;
export const practiceHref = (id: string) => `/dashboard/provas/treino/${id}`;
