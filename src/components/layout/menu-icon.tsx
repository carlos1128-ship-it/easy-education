import type { SVGProps } from "react";

export type MenuIconName =
  | "dashboard"
  | "trilha"
  | "chat"
  | "arquivos"
  | "quizzes"
  | "flashcards"
  | "plano"
  | "redacao"
  | "simulados"
  | "provas"
  | "anotacoes"
  | "desempenho";

const ICON_PATHS: Record<MenuIconName, string[]> = {
  dashboard: [
    "M5 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M15 3h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M15 15h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z",
  ],
  trilha: [
    "M3.5 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0",
    "M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h4",
    "M17 2v7",
    "M17 2.5h3.5l-1 1.5 1 1.5H17",
  ],
  chat: [
    "M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6l-4 4v-4a3 3 0 0 1-3-3z",
    "M12 6.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z",
  ],
  arquivos: ["M3 8V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 10h18", "M8 15h5"],
  quizzes: [
    "M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0",
    "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3",
    "M12 17h.01",
  ],
  flashcards: [
    "M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3",
    "M5 7h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z",
    "M7 14h5",
  ],
  plano: [
    "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
    "M3 10h18",
    "M8 3v4",
    "M16 3v4",
    "M9 15.5l2 2 4-4",
  ],
  redacao: ["M14.5 4.5l5 5L10 19H5v-5z", "M12.5 6.5l5 5", "M14 20h6"],
  simulados: [
    "M5 14a7 7 0 1 0 14 0a7 7 0 0 0-14 0",
    "M12 10.5V14l2.5 2",
    "M10 3h4",
    "M12 3v4",
    "M18.5 6.5L20 5",
  ],
  provas: [
    "M6 3h9l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M15 3v4h4",
    "M9 14.5a3 3 0 1 0 1-2.2",
    "M8.7 10.6v1.9h1.9",
  ],
  anotacoes: [
    "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M3 7.5h4",
    "M3 12h4",
    "M3 16.5h4",
    "M10 8h5",
    "M10 12h5",
    "M10 16h3",
  ],
  desempenho: ["M4 4v16h16", "M7.5 15l3.5-3.5 3 3 5-6", "M15 8.5h4v4"],
};

type MenuIconProps = SVGProps<SVGSVGElement> & { name: MenuIconName; size?: number; strokeWidth?: number };

export function MenuIcon({ name, size = 20, strokeWidth = 1.75, ...props }: MenuIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {ICON_PATHS[name].map((path) => <path key={path} d={path} />)}
    </svg>
  );
}
