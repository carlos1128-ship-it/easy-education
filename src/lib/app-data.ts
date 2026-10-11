import { BookOpen, CalendarCheck, CreditCard, FileEdit, PenTool, Settings, Sparkles, Target, Upload, type LucideIcon } from "lucide-react";
import type { MenuIconName } from "@/components/layout/menu-icon";

type NavItem = {
  href: string;
  label: string;
  icon: MenuIconName | LucideIcon;
  group: "Menu Principal" | "Meus Estudos" | "Footer";
  accent?: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", group: "Menu Principal" },
  { href: "/dashboard/trilha", label: "Trilha", icon: "trilha", group: "Menu Principal" },
  { href: "/dashboard/chat", label: "Chat IA", icon: "chat", group: "Menu Principal", accent: "#06B6D4" },
  { href: "/dashboard/arquivos", label: "Arquivos", icon: "arquivos", group: "Menu Principal" },
  { href: "/dashboard/quizzes", label: "Quizzes", icon: "quizzes", group: "Menu Principal" },
  { href: "/dashboard/flashcards", label: "Flashcards", icon: "flashcards", group: "Menu Principal" },
  { href: "/dashboard/plano", label: "Plano de estudo", icon: "plano", group: "Meus Estudos" },
  { href: "/dashboard/redacao", label: "Redação", icon: "redacao", group: "Meus Estudos" },
  { href: "/dashboard/simulados", label: "Simulados", icon: "simulados", group: "Meus Estudos" },
  { href: "/dashboard/provas", label: "Provas anteriores", icon: "provas", group: "Meus Estudos" },
  { href: "/dashboard/anotacoes", label: "Anotações", icon: "anotacoes", group: "Meus Estudos" },
  { href: "/dashboard/desempenho", label: "Desempenho", icon: "desempenho", group: "Meus Estudos" },
  { href: "/dashboard/assinatura", label: "Assinatura", icon: CreditCard, group: "Footer" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings, group: "Footer" },
] ;

export const features = [
  { title: "Chat IA", icon: Sparkles, text: "Tire dúvidas, gere resumos e aprenda com explicações no seu ritmo." },
  { title: "Upload de materiais", icon: Upload, text: "Envie PDFs e apostilas para transformar conteúdo em revisões." },
  { title: "Plano personalizado", icon: CalendarCheck, text: "Receba uma agenda semanal baseada no seu objetivo e tempo real." },
  { title: "Quiz e simulados", icon: Target, text: "Pratique com questões no estilo da sua prova: escola, faculdade, vestibular ou concurso." },
  { title: "Flashcards", icon: BookOpen, text: "Revise com repetição espaçada e foco no que você ainda esquece." },
  { title: "Correção de redação", icon: FileEdit, text: "Veja a nota de 0 a 1000 e o nível de cada competência, pela grade oficial do Enem." },
] as const;

export const quickSuggestions = [
  "Crie 12 flashcards de Biologia celular",
  "Gere 10 questões de Matemática sobre funções",
  "Monte meu plano de estudo para esta semana",
  "Explique o conteúdo que mais errei nos quizzes",
] as const;
