import {
  BarChart,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  FileEdit,
  Folder,
  Layers,
  LayoutDashboard,
  PenTool,
  Settings,
  Sparkles,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "Menu Principal" | "Meus Estudos" | "Footer";
  accent?: string;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Menu Principal" },
  { href: "/dashboard/chat", label: "Chat IA", icon: Sparkles, group: "Menu Principal", accent: "#06B6D4" },
  { href: "/dashboard/arquivos", label: "Arquivos", icon: Folder, group: "Menu Principal" },
  { href: "/dashboard/quizzes", label: "Quizzes", icon: Target, group: "Menu Principal" },
  { href: "/dashboard/flashcards", label: "Flashcards", icon: Layers, group: "Menu Principal" },
  { href: "/dashboard/plano", label: "Plano de Estudo", icon: Calendar, group: "Meus Estudos" },
  { href: "/dashboard/redacao", label: "Redacao", icon: PenTool, group: "Meus Estudos" },
  { href: "/dashboard/simulados", label: "Simulados", icon: ClipboardCheck, group: "Meus Estudos" },
  { href: "/dashboard/desempenho", label: "Desempenho", icon: BarChart, group: "Meus Estudos" },
  { href: "/dashboard/configuracoes", label: "Configuracoes", icon: Settings, group: "Footer" },
] ;

export const features = [
  { title: "Chat IA", icon: Sparkles, text: "Tire duvidas, gere resumos e aprenda com explicacoes no seu ritmo." },
  { title: "Upload de materiais", icon: Upload, text: "Envie PDFs e apostilas para transformar conteudo em revisoes." },
  { title: "Plano personalizado", icon: CalendarCheck, text: "Receba uma agenda semanal baseada no seu objetivo e tempo real." },
  { title: "Quiz e simulados", icon: Target, text: "Pratique com questoes no estilo ENEM, vestibular ou concurso." },
  { title: "Flashcards", icon: BookOpen, text: "Revise com repeticao espacada e foco no que voce ainda esquece." },
  { title: "Correcao de redacao", icon: FileEdit, text: "Veja nota, criterios e melhorias seguindo rubricas ENEM ou SAT." },
] as const;

export const quickSuggestions = [
  "Crie um resumo do meu ultimo arquivo enviado",
  "Gere 10 questoes de Matematica nivel ENEM",
  "Monte meu plano de estudo para esta semana",
  "Explique o conteudo que mais errei nos quizzes",
] as const;
