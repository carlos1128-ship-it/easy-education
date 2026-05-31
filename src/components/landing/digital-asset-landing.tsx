/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  LineChart,
  Menu,
  MessageSquare,
  PenTool,
  Sparkles,
  Star,
  Target,
  X
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const [billingAnnual, setBillingAnnual] = useState(false);

  useEffect(() => {
    const el = document.querySelector(".easy-landing");
    const target = el ?? window;
    const onScroll = () => {
      const scrollTop = el ? el.scrollTop : window.scrollY;
      setScrolled(scrollTop > 20);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = ["inicio", "recursos", "como-funciona", "planos", "faq"];
    const root = document.querySelector(".easy-landing") as Element | null;
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { root, threshold: 0.35 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="easy-landing w-full overflow-x-hidden">
      {/* 1. Navbar */}
      <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-lg border-b border-[var(--color-easy-border)] shadow-sm" : "bg-transparent border-b border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-easy-primary)] flex items-center justify-center text-white">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="font-heading font-bold text-xl text-[var(--color-easy-text)]">
                Easy Education
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              {[
                { id: "inicio", label: "InÃ­cio" },
                { id: "como-funciona", label: "Como funciona" },
                { id: "recursos", label: "Recursos" },
                { id: "planos", label: "Planos" },
                { id: "faq", label: "FAQ" },
              ].map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`font-medium transition-all duration-200 relative py-1 ${
                    activeSection === id
                      ? "text-[var(--color-easy-primary)]"
                      : "text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)]"
                  }`}
                >
                  {label}
                  {activeSection === id && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-[var(--color-easy-primary)]" />
                  )}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center">
              <a href="/login" className={buttonVariants({ variant: "outline", className: "font-heading font-semibold text-[var(--color-easy-primary)] border-[var(--color-easy-primary)] hover:bg-[var(--color-easy-primary)] hover:text-white transition-all rounded-full px-6" })}>
                Entrar
              </a>
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-[var(--color-easy-text)]">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--color-easy-card)] border-b border-[var(--color-easy-border)] px-4 pt-2 pb-4 space-y-1">
            <a href="#inicio" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--color-easy-text)] hover:bg-[var(--color-easy-bg)]">InÃ­cio</a>
            <a href="#como-funciona" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--color-easy-text)] hover:bg-[var(--color-easy-bg)]">Como funciona</a>
            <a href="#recursos" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--color-easy-text)] hover:bg-[var(--color-easy-bg)]">Recursos</a>
            <a href="#planos" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--color-easy-text)] hover:bg-[var(--color-easy-bg)]">Planos</a>
            <a href="#faq" className="block px-3 py-2 rounded-md text-base font-medium text-[var(--color-easy-text)] hover:bg-[var(--color-easy-bg)]">FAQ</a>
            <div className="mt-4 pt-4 border-t border-[var(--color-easy-border)]">
              <a href="/login" className={buttonVariants({ className: "w-full font-heading font-semibold bg-[var(--color-easy-primary)] text-white hover:opacity-90 rounded-full" })}>
                Entrar
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section id="inicio" className="relative pt-20 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
            <div className="easy-animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-easy-primary)]/10 border border-[var(--color-easy-primary)]/20 text-[var(--color-easy-primary)] font-medium text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                Seu estudo, mais fÃ¡cil
              </div>

              <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-easy-primary)] to-[var(--color-easy-secondary)]">Estude fÃ¡cil</span><br/>
                com a Easy Education
              </h1>

              <p className="text-lg text-[var(--color-easy-text-muted)] mb-8 max-w-lg leading-relaxed">
                Organize sua rotina, acompanhe seu progresso e aprenda de forma mais simples com quizzes, flashcards, redaÃ§Ã£o e plano de estudos.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a href="/cadastro" className={buttonVariants({ className: "font-heading font-semibold bg-[var(--color-easy-primary)] text-white hover:opacity-90 transition-all rounded-full px-8 py-6 text-lg shadow-[0_8px_20px_-8px_var(--color-easy-primary)] hover:-translate-y-1" })}>
                  ComeÃ§ar
                </a>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--color-easy-bg)] flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: ['#4F46E5', '#06B6D4', '#8B5CF6', '#22C55E'][i] }}>
                      {['A', 'M', 'P', 'L'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-[var(--color-easy-yellow)]">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-sm font-medium text-[var(--color-easy-text-muted)] mt-1">
                    Avaliado com 5 estrelas por estudantes
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-16 lg:mt-0 relative easy-animate-fade-in-up easy-delay-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-easy-primary)]/10 to-[var(--color-easy-secondary)]/10 rounded-full blur-3xl -z-10 transform scale-110"></div>

              <div className="relative z-10">
                <img
                  src="/__mockup/images/students_nobg.png"
                  alt="Students studying"
                  className="w-full h-auto object-contain drop-shadow-2xl easy-animate-float scale-125 origin-bottom"
                />

                {/* Floating Cards */}
                <div className="absolute top-10 -left-6 bg-white p-4 rounded-xl shadow-xl easy-animate-float-delayed flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-easy-green)]/10 flex items-center justify-center text-[var(--color-easy-green)]">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-easy-text-muted)] font-medium">Progresso</p>
                    <p className="text-lg font-bold text-[var(--color-easy-text)]">76%</p>
                  </div>
                </div>

                <div className="absolute bottom-20 -right-4 bg-white p-4 rounded-xl shadow-xl easy-animate-float flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-easy-primary)]/10 flex items-center justify-center text-[var(--color-easy-primary)]">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-easy-text-muted)] font-medium">Plano de hoje</p>
                    <p className="text-sm font-bold text-[var(--color-easy-text)]">4 tarefas</p>
                  </div>
                </div>

                <div className="absolute top-1/2 -right-8 bg-white p-3 rounded-xl shadow-xl easy-animate-float-delayed flex items-center gap-2">
                  <Star className="w-5 h-5 text-[var(--color-easy-yellow)] fill-current" />
                  <p className="text-sm font-bold text-[var(--color-easy-text)]">5.0 â˜…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Benefits Section */}
      <section id="recursos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que vocÃª precisa para estudar melhor</h2>
            <p className="text-lg text-[var(--color-easy-text-muted)]">
              Recursos pensados para ajudar vocÃª a estudar com mais clareza, prÃ¡tica e consistÃªncia.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-[var(--color-easy-border)] rounded-2xl p-6 easy-hover-lift shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-easy-primary)]/10 text-[var(--color-easy-primary)] flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Plano de estudos</h3>
              <p className="text-[var(--color-easy-text-muted)]">Organize sua rotina com tarefas e metas claras.</p>
            </div>

            <div className="bg-white border border-[var(--color-easy-border)] rounded-2xl p-6 easy-hover-lift shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-easy-secondary)]/10 text-[var(--color-easy-secondary)] flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Quizzes</h3>
              <p className="text-[var(--color-easy-text-muted)]">Pratique conteÃºdos com perguntas objetivas.</p>
            </div>

            <div className="bg-white border border-[var(--color-easy-border)] rounded-2xl p-6 easy-hover-lift shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-easy-purple)]/10 text-[var(--color-easy-purple)] flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Flashcards</h3>
              <p className="text-[var(--color-easy-text-muted)]">Revise os pontos principais no momento certo.</p>
            </div>

            <div className="bg-white border border-[var(--color-easy-border)] rounded-2xl p-6 easy-hover-lift shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-easy-green)]/10 text-[var(--color-easy-green)] flex items-center justify-center mb-6">
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">RedaÃ§Ã£o</h3>
              <p className="text-[var(--color-easy-text-muted)]">Acompanhe correÃ§Ãµes e evoluÃ§Ã£o do seu texto.</p>
            </div>

            <div className="bg-white border border-[var(--color-easy-border)] rounded-2xl p-6 easy-hover-lift shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-easy-yellow)]/20 text-[var(--color-easy-yellow)] flex items-center justify-center mb-6">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Simulados</h3>
              <p className="text-[var(--color-easy-text-muted)]">Teste seu desempenho e descubra onde melhorar.</p>
            </div>

            <div className="bg-white border border-[var(--color-easy-border)] rounded-2xl p-6 easy-hover-lift shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-slate-900/10 text-slate-900 flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Chat IA</h3>
              <p className="text-[var(--color-easy-text-muted)]">Tire dÃºvidas e receba ajuda nos estudos quando precisar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How it works section */}
      <section id="como-funciona" className="py-24 bg-[var(--color-easy-bg)] border-y border-[var(--color-easy-border)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[var(--color-easy-primary)]/20 to-[var(--color-easy-primary)]/20 border-t-2 border-dashed border-[var(--color-easy-primary)]/30 -z-0"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center mb-6 border-4 border-[var(--color-easy-bg)]">
                <div className="w-16 h-16 rounded-full bg-[var(--color-easy-primary)] text-white flex items-center justify-center text-2xl font-bold">1</div>
              </div>
              <h3 className="text-xl font-bold mb-3">Organize seus estudos</h3>
              <p className="text-[var(--color-easy-text-muted)]">Crie seu plano e defina suas metas de forma simples.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center mb-6 border-4 border-[var(--color-easy-bg)]">
                <div className="w-16 h-16 rounded-full bg-[var(--color-easy-primary)] text-white flex items-center justify-center text-2xl font-bold">2</div>
              </div>
              <h3 className="text-xl font-bold mb-3">Pratique com recursos inteligentes</h3>
              <p className="text-[var(--color-easy-text-muted)]">Use quizzes, flashcards e simulados para fixar o conteÃºdo.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center mb-6 border-4 border-[var(--color-easy-bg)]">
                <div className="w-16 h-16 rounded-full bg-[var(--color-easy-primary)] text-white flex items-center justify-center text-2xl font-bold">3</div>
              </div>
              <h3 className="text-xl font-bold mb-3">Acompanhe sua evoluÃ§Ã£o</h3>
              <p className="text-[var(--color-easy-text-muted)]">Veja seu progresso e ajuste a rotina conforme avanÃ§a.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Product Demo */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--color-easy-primary)]/5 -z-10"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--color-easy-primary)]/10 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--color-easy-secondary)]/10 rounded-full blur-[100px] -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Veja sua rotina de estudos em um sÃ³ lugar</h2>
            <p className="text-lg text-[var(--color-easy-text-muted)]">
              Acompanhe tarefas, desempenho, redaÃ§Ãµes, revisÃµes e progresso em uma interface simples e organizada.
            </p>
          </div>

          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-easy-primary)] to-[var(--color-easy-secondary)] rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white p-2 rounded-2xl shadow-2xl border border-[var(--color-easy-border)]/50">
              <div className="bg-slate-100 rounded-xl overflow-hidden">
                <div className="h-8 bg-slate-200 flex items-center px-4 gap-2 border-b border-slate-300">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <img
                  src="/__mockup/images/dashboard_mockup.png"
                  alt="Plataforma Easy Education"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Social Proof */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 py-10 border-y border-[var(--color-easy-border)] text-center divide-y md:divide-y-0 md:divide-x divide-[var(--color-easy-border)]">
            <div className="py-4 md:py-0">
              <p className="text-4xl font-extrabold text-[var(--color-easy-primary)] mb-2">4.9 / 5</p>
              <p className="text-[var(--color-easy-text-muted)] font-medium">estrelas</p>
            </div>
            <div className="py-4 md:py-0">
              <p className="text-4xl font-extrabold text-[var(--color-easy-primary)] mb-2">10k+</p>
              <p className="text-[var(--color-easy-text-muted)] font-medium">estudantes</p>
            </div>
            <div className="py-4 md:py-0">
              <p className="text-4xl font-extrabold text-[var(--color-easy-primary)] mb-2">98%</p>
              <p className="text-[var(--color-easy-text-muted)] font-medium">satisfaÃ§Ã£o</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[var(--color-easy-bg)] p-8 rounded-2xl relative">
              <div className="flex text-[var(--color-easy-yellow)] mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-[var(--color-easy-text)] font-medium mb-6 italic">&quot;A organizaÃ§Ã£o que a plataforma traz Ã© incrÃ­vel. Consegui aumentar minha nota em matemÃ¡tica apenas seguindo o plano gerado para mim.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-easy-purple)] flex items-center justify-center font-bold text-white">M</div>
                <div>
                  <p className="font-bold">Mariana Costa</p>
                  <p className="text-sm text-[var(--color-easy-text-muted)]">Estudante ENEM</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-easy-bg)] p-8 rounded-2xl relative">
              <div className="flex text-[var(--color-easy-yellow)] mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-[var(--color-easy-text)] font-medium mb-6 italic">&quot;Os simulados e flashcards mudaram meu jeito de revisar. Ã‰ tudo muito direto e nÃ£o perco mais tempo procurando material.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-easy-secondary)] flex items-center justify-center font-bold text-white">R</div>
                <div>
                  <p className="font-bold">Rafael Lima</p>
                  <p className="text-sm text-[var(--color-easy-text-muted)]">Estudante Concursos</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-easy-bg)] p-8 rounded-2xl relative">
              <div className="flex text-[var(--color-easy-yellow)] mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-[var(--color-easy-text)] font-medium mb-6 italic">&quot;A redaÃ§Ã£o com correÃ§Ã£o rÃ¡pida me ajudou a sair dos 600 pontos para 920. A interface Ã© super agradÃ¡vel e nÃ£o cansa.&quot;</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-easy-green)] flex items-center justify-center font-bold text-white">L</div>
                <div>
                  <p className="font-bold">LetÃ­cia Souza</p>
                  <p className="text-sm text-[var(--color-easy-text-muted)]">Estudante SAT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Pricing */}
      <section id="planos" className="py-24 bg-[var(--color-easy-bg)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Escolha seu plano</h2>
            <p className="text-lg text-[var(--color-easy-text-muted)]">
              Planos acessÃ­veis que cabem no bolso do estudante.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`font-medium text-sm transition-colors ${!billingAnnual ? "text-[var(--color-easy-text)]" : "text-[var(--color-easy-text-muted)]"}`}>Mensal</span>
            <button
              onClick={() => setBillingAnnual(!billingAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${billingAnnual ? "bg-[var(--color-easy-primary)]" : "bg-slate-300"}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${billingAnnual ? "translate-x-7" : "translate-x-0"}`} />
            </button>
            <span className={`font-medium text-sm transition-colors ${billingAnnual ? "text-[var(--color-easy-text)]" : "text-[var(--color-easy-text-muted)]"}`}>
              Anual
              <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-easy-green)]/15 text-[var(--color-easy-green)]">
                2 meses
              </span>
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Essencial */}
            <div className="bg-white rounded-3xl p-8 border border-[var(--color-easy-border)] shadow-sm flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">Essencial</h3>
                <p className="text-sm text-[var(--color-easy-text-muted)]">Para quem estÃ¡ comeÃ§ando a organizar os estudos.</p>
              </div>

              <div className="mb-2">
                {billingAnnual && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm line-through text-[var(--color-easy-text-muted)]">R$ 238,80/ano</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-easy-green)]/15 text-[var(--color-easy-green)]">20% off</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[var(--color-easy-text)]">
                    {billingAnnual ? "R$ 190,90" : "R$ 19,90"}
                  </span>
                  <span className="text-[var(--color-easy-text-muted)] text-sm">/{billingAnnual ? "ano" : "mÃªs"}</span>
                </div>
                {billingAnnual && (
                  <p className="text-xs text-[var(--color-easy-text-muted)] mt-1">equivale a R$ 15,91/mÃªs</p>
                )}
              </div>

              <a href="/cadastro" className={buttonVariants({ className: "w-full font-heading font-semibold bg-white text-[var(--color-easy-primary)] border-2 border-[var(--color-easy-primary)] hover:bg-[var(--color-easy-primary)] hover:text-white transition-all rounded-xl py-6 mb-8 mt-4" })}>
                ComeÃ§ar
              </a>

              <ul className="space-y-3 flex-1">
                {[
                  { text: "Plano de estudos bÃ¡sico", ok: true },
                  { text: "AtÃ© 200 questÃµes por mÃªs", ok: true },
                  { text: "AtÃ© 300 flashcards", ok: true },
                  { text: "1 simulado por mÃªs", ok: true },
                  { text: "1 correÃ§Ã£o de redaÃ§Ã£o/mÃªs", ok: true },
                  { text: "Quizzes ilimitados", ok: false },
                  { text: "Chat IA", ok: false },
                ].map(({ text, ok }) => (
                  <li key={text} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${ok ? "text-[var(--color-easy-primary)]" : "text-slate-300"}`} />
                    <span className={ok ? "text-[var(--color-easy-text-muted)]" : "text-slate-300 line-through"}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro */}
            <div className="bg-[var(--color-easy-primary)] rounded-3xl p-8 shadow-2xl relative text-white flex flex-col">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[var(--color-easy-secondary)] to-blue-400 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                Mais completo
              </div>

              <div className="mb-6 mt-2">
                <h3 className="text-xl font-bold mb-1">Pro</h3>
                <p className="text-sm text-white/70">Para quem quer evoluir de verdade, sem limites.</p>
              </div>

              <div className="mb-2">
                {billingAnnual && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm line-through text-white/50">R$ 598,80/ano</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">18% off</span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">
                    {billingAnnual ? "R$ 490,90" : "R$ 49,90"}
                  </span>
                  <span className="text-white/70 text-sm">/{billingAnnual ? "ano" : "mÃªs"}</span>
                </div>
                {billingAnnual && (
                  <p className="text-xs text-white/60 mt-1">equivale a R$ 40,91/mÃªs</p>
                )}
              </div>

              <a href="/cadastro" className={buttonVariants({ className: "w-full font-heading font-semibold bg-white text-[var(--color-easy-primary)] hover:bg-slate-50 transition-all rounded-xl py-6 mb-8 mt-4" })}>
                ComeÃ§ar
              </a>

              <ul className="space-y-3 flex-1">
                {[
                  "Plano de estudos personalizado",
                  "QuestÃµes ilimitadas",
                  "Flashcards ilimitados",
                  "Simulados ilimitados",
                  "CorreÃ§Ãµes de redaÃ§Ã£o ilimitadas",
                  "Quizzes ilimitados",
                  "Chat IA 24/7",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-white" />
                    <span className="text-white/90">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas frequentes</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="border-[var(--color-easy-border)] border rounded-xl px-6 data-[state=open]:bg-[var(--color-easy-bg)] transition-colors">
              <AccordionTrigger className="text-base font-semibold hover:no-underline py-6">Para quais provas a Easy Education serve?</AccordionTrigger>
              <AccordionContent className="text-[var(--color-easy-text-muted)] text-base">
                Nossa plataforma Ã© focada em estudantes que se preparam para o ENEM, vestibulares tradicionais, SAT e concursos pÃºblicos. Os planos de estudos se adaptam Ã  sua meta especÃ­fica.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-[var(--color-easy-border)] border rounded-xl px-6 data-[state=open]:bg-[var(--color-easy-bg)] transition-colors">
              <AccordionTrigger className="text-base font-semibold hover:no-underline py-6">Posso estudar para ENEM e concursos ao mesmo tempo?</AccordionTrigger>
              <AccordionContent className="text-[var(--color-easy-text-muted)] text-base">
                Sim. VocÃª pode criar trilhas de estudo paralelas e a plataforma ajustarÃ¡ seu cronograma para conciliar os horÃ¡rios sem sobrecarregar sua rotina.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-[var(--color-easy-border)] border rounded-xl px-6 data-[state=open]:bg-[var(--color-easy-bg)] transition-colors">
              <AccordionTrigger className="text-base font-semibold hover:no-underline py-6">O que tem dentro da plataforma?</AccordionTrigger>
              <AccordionContent className="text-[var(--color-easy-text-muted)] text-base">
                VocÃª terÃ¡ acesso a um painel com seu cronograma diÃ¡rio, banco de questÃµes (quizzes), criador de flashcards, mÃ³dulo de redaÃ§Ã£o com envio para correÃ§Ã£o e relatÃ³rios detalhados de desempenho.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-[var(--color-easy-border)] border rounded-xl px-6 data-[state=open]:bg-[var(--color-easy-bg)] transition-colors">
              <AccordionTrigger className="text-base font-semibold hover:no-underline py-6">Posso acompanhar meu progresso?</AccordionTrigger>
              <AccordionContent className="text-[var(--color-easy-text-muted)] text-base">
                Com certeza. O painel de progresso mostra seus acertos por matÃ©ria, tempo estudado, tarefas concluÃ­das e evoluÃ§Ã£o nas notas de redaÃ§Ã£o.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-[var(--color-easy-border)] border rounded-xl px-6 data-[state=open]:bg-[var(--color-easy-bg)] transition-colors">
              <AccordionTrigger className="text-base font-semibold hover:no-underline py-6">A plataforma ajuda com redaÃ§Ã£o?</AccordionTrigger>
              <AccordionContent className="text-[var(--color-easy-text-muted)] text-base">
                Sim! Temos propostas semanais de redaÃ§Ã£o focadas nos modelos do ENEM e vestibulares. VocÃª escreve, envia e recebe uma correÃ§Ã£o detalhada baseada nas competÃªncias exigidas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-[var(--color-easy-border)] border rounded-xl px-6 data-[state=open]:bg-[var(--color-easy-bg)] transition-colors">
              <AccordionTrigger className="text-base font-semibold hover:no-underline py-6">Existe suporte para tirar dÃºvidas?</AccordionTrigger>
              <AccordionContent className="text-[var(--color-easy-text-muted)] text-base">
                Dependendo do seu plano, vocÃª pode utilizar nosso Chat IA focado em educaÃ§Ã£o para tirar dÃºvidas pontuais 24/7 sobre os conteÃºdos que estÃ¡ estudando.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-24 bg-gradient-to-r from-[var(--color-easy-primary)] to-[var(--color-easy-secondary)] text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Comece a estudar com mais clareza e organizaÃ§Ã£o</h2>
          <p className="text-xl text-white/90 mb-10">
            A Easy Education ajuda vocÃª a manter o foco e evoluir todos os dias.
          </p>
          <a href="/cadastro" className={buttonVariants({ className: "font-heading font-bold bg-white text-[var(--color-easy-primary)] hover:bg-slate-50 rounded-full px-10 py-7 text-xl shadow-xl hover:-translate-y-1 transition-all" })}>
            ComeÃ§ar
          </a>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="bg-white pt-20 pb-10 border-t border-[var(--color-easy-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-easy-primary)] flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="font-heading font-bold text-xl text-[var(--color-easy-text)]">
                  Easy Education
                </span>
              </div>
              <p className="text-[var(--color-easy-text-muted)] max-w-xs">
                Seu companheiro inteligente para estudos. Acompanhe progresso, pratique e evolua.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Produto</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Recursos</a></li>
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Planos</a></li>
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Estudantes</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Suporte</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">FAQ</a></li>
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--color-easy-border)] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[var(--color-easy-text-muted)] text-sm">
              Â© 2025 Easy Education. Todos os direitos reservados.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-8 h-8 rounded-full bg-[var(--color-easy-bg)] flex items-center justify-center text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] hover:bg-[var(--color-easy-primary)]/10 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
              </a>
              <a href="#" className="w-8 h-8 rounded-full bg-[var(--color-easy-bg)] flex items-center justify-center text-[var(--color-easy-text-muted)] hover:text-[var(--color-easy-primary)] hover:bg-[var(--color-easy-primary)]/10 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
