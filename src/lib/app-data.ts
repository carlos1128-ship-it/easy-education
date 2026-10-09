import {
  BarChart,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  FileEdit,
  Folder,
  Layers,
  LayoutDashboard,
  Library,
  PenTool,
  Route,
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
  { href: "/dashboard/trilha", label: "Trilha", icon: Route, group: "Menu Principal" },
  { href: "/dashboard/chat", label: "Chat IA", icon: Sparkles, group: "Menu Principal", accent: "#06B6D4" },
  { href: "/dashboard/banco", label: "Banco de questões", icon: Library, group: "Menu Principal" },
  { href: "/dashboard/arquivos", label: "Arquivos", icon: Folder, group: "Menu Principal" },
  { href: "/dashboard/quizzes", label: "Quizzes", icon: Target, group: "Menu Principal" },
  { href: "/dashboard/flashcards", label: "Flashcards", icon: Layers, group: "Menu Principal" },
  { href: "/dashboard/plano", label: "Plano de estudo", icon: Calendar, group: "Meus Estudos" },
  { href: "/dashboard/redacao", label: "Redação", icon: PenTool, group: "Meus Estudos" },
  { href: "/dashboard/simulados", label: "Simulados", icon: ClipboardCheck, group: "Meus Estudos" },
  { href: "/dashboard/desempenho", label: "Desempenho", icon: BarChart, group: "Meus Estudos" },
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
