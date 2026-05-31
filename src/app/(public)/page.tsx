import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { features } from "@/lib/app-data";

const testimonials = [
  { name: "Mariana Alves", goal: "Aprovada no FUVEST", avatar: "MA" },
  { name: "Lucas Ribeiro", goal: "820 na redacao ENEM", avatar: "LR" },
  { name: "Bianca Souza", goal: "Concurso publico", avatar: "BS" },
];

const plans = [
  { name: "Gratis", price: "R$ 0", perks: ["5 quizzes/mes", "2 uploads", "Chat basico"] },
  { name: "Pro", price: "R$ 29,90/mes", perks: ["Quizzes ilimitados", "Uploads ilimitados", "Redacao e flashcards"], featured: true },
  { name: "Anual", price: "R$ 19,90/mes", perks: ["Tudo do Pro", "Economia anual", "Prioridade em novidades"] },
];

export default function LandingPage() {
  return (
    <main className="bg-[#0A0F1C] text-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-lg font-medium">Easy Education</Link>
        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#funcionalidades">Funcionalidades</a>
          <a href="#planos">Planos</a>
          <a href="#blog">Blog</a>
        </div>
        <Link href="/cadastro">
          <Button className="bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]">Comecar gratis</Button>
        </Link>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex animate-pulse rounded-full border border-[#3B6FE8]/40 bg-[#1E2433] px-4 py-2 text-sm text-[#DBEAFE]">
            IA educacional personalizada
          </span>
          <h1 className="mt-8 text-5xl font-medium leading-tight md:text-7xl">Estude melhor, nao apenas mais.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Transforme PDFs, objetivos e duvidas em planos, quizzes, flashcards e feedbacks para ENEM, vestibulares e concursos.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro"><Button className="bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]">Criar conta gratis</Button></Link>
            <Link href="/login"><Button variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-[#111827]">Entrar</Button></Link>
          </div>
        </div>
        <div className="mt-14 rounded-lg border border-slate-700 bg-[#111827] p-4 shadow-2xl">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-slate-700 bg-[#1E2433] p-6">
              <p className="text-sm text-slate-400">Plano de hoje</p>
              {["Matematica - funcoes", "Redacao - repertorio", "Biologia - citologia"].map((item) => (
                <div key={item} className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 p-3">
                  <span>{item}</span><span className="text-sm text-[#22C55E]">50 min</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#1E2433] p-6">
              <p className="text-sm text-slate-400">Desempenho por area</p>
              {["Redacao 88%", "Portugues 82%", "Natureza 73%"].map((item) => (
                <div key={item} className="mt-5">
                  <div className="mb-2 flex justify-between text-sm"><span>{item.split(" ")[0]}</span><span>{item.split(" ")[1]}</span></div>
                  <div className="h-2 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-[#3B6FE8]" style={{ width: item.split(" ")[1] }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="bg-[#F8FAFD] px-6 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-medium">Tudo que seu estudo precisa em um lugar</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-slate-200 bg-white p-6">
                <feature.icon className="size-6 text-[#1B4FD8]" />
                <h3 className="mt-5 text-lg font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          {["Defina seu objetivo e prazo", "Envie seus materiais", "A IA cria seu plano e estuda com voce"].map((step, index) => (
            <div key={step}>
              <span className="text-sm text-[#1B4FD8]">Passo {index + 1}</span>
              <h3 className="mt-3 text-2xl font-medium">{step}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#F8FAFD] px-6 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-6">
                <div className="mb-4 flex gap-1 text-[#F59E0B]">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className="size-4 fill-current" />)}</div>
                <p className="text-sm text-slate-600">A Easy organizou minha semana e me fez revisar exatamente o que eu esquecia.</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-[#EFF4FF] text-sm text-[#1B4FD8]">{item.avatar}</div>
                  <div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.goal}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="bg-white px-6 py-20 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-medium">Planos simples para comecar hoje</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-lg border bg-white p-6 ${plan.featured ? "border-[#1B4FD8]" : "border-slate-200"}`}>
                <h3 className="text-xl font-medium">{plan.name}</h3>
                <p className="mt-4 text-3xl font-medium">{plan.price}</p>
                <ul className="mt-5 space-y-3 text-sm text-slate-600">{plan.perks.map((perk) => <li key={perk}>- {perk}</li>)}</ul>
                <Link href="/cadastro"><Button className="mt-6 w-full bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]">Comecar</Button></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center">
        <h2 className="text-3xl font-medium">Seu proximo estudo pode ser mais inteligente.</h2>
        <Link href="/cadastro"><Button className="mt-6 gap-2 bg-[#1B4FD8] text-white hover:bg-[#0F2B8A]">Criar conta gratis <ArrowRight className="size-4" /></Button></Link>
      </section>

      <footer id="blog" className="border-t border-slate-800 px-6 py-8 text-sm text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row">
          <p>Easy Education</p>
          <p>Funcionalidades · Planos · Blog · Instagram · LinkedIn</p>
          <p>© 2026 Easy Education</p>
        </div>
      </footer>
    </main>
  );
}
