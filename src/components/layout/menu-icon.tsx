import Image from "next/image";

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

export function MenuIcon({ name, size = 24 }: { name: MenuIconName; size?: number }) {
  return (
    <Image
      src={`/icons/menu/${name}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className="block flex-none"
    />
  );
}
