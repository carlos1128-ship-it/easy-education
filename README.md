# Easy Education

MVP SaaS educacional com Next.js, Supabase, Prisma e Gemini. Slogan: **Estude melhor, nao apenas mais.**

## Stack

- Next.js App Router + TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase Auth, PostgreSQL e Storage
- Prisma ORM
- Google Gemini via `@google/genai`
- `pdf-parse`, React Hook Form, Zod, Recharts, Lucide, Sonner

## Planos, limites e banco de questoes

- **Planos** (Gratuito, Basico R$ 19,90, Completo R$ 34,90): precos e limites num unico arquivo, `src/lib/plans.ts`. O servidor aplica todos os limites (`consumeFeature` em `src/lib/usage.ts`, com lock por aluno); a interface so mostra avisos e cadeados. Janelas diarias e semanais seguem o horario de Brasilia.
- **Custo de IA**: cada chamada ao Gemini grava tokens e custo estimado em `ai_call_logs`. Tela interna: `/dashboard/interno/custos` (e-mails em `ADMIN_EMAILS`). Ver `docs/consumo-ia.md`.
- **Banco de questoes**: tabelas `exams`, `bank_subjects`, `bank_topics`, `bank_questions` e relacionadas. Importacao e classificacao por scripts em `scripts/bank/` (ver `docs/fontes-questoes.md`). Reports e revisao de professor em `/dashboard/interno/questoes`.
- **Evidencias** usadas na landing: `docs/evidencias.md` e `/evidencias`.
- Testes: `npm test` (Vitest, regras puras) e, contra o banco configurado, `npx tsx --env-file=.env.local scripts/usage-smoke.ts` e `scripts/bank-smoke.ts` (usam alunos de mentira e apagam o que criam).

## Setup

```bash
npm install
cp .env.example .env.local # no PowerShell: Copy-Item .env.example .env.local
npm run db:generate
npm run dev
```

As migrations criam/atualizam o bucket privado `arquivos`, RLS e Realtime.

## Variaveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
# Alternativa aceita pelo codigo:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
GEMINI_API_KEY=sua_chave_gemini
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=postgresql://postgres:senha@db.seu-projeto.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:senha@db.seu-projeto.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

O app detecta placeholders de Supabase em desenvolvimento. Se `NEXT_PUBLIC_SUPABASE_URL` ou a key publica ainda estiverem com valores de exemplo, os formularios de login/cadastro exibem uma mensagem clara em vez de falhar silenciosamente.

`GEMINI_API_KEY` deve ficar somente no servidor (`.env.local` localmente e variaveis de ambiente da Vercel em producao). Nao use prefixo `NEXT_PUBLIC_` nessa chave.

`SUPABASE_SERVICE_ROLE_KEY` tambem deve ficar somente no servidor. O cadastro do MVP usa essa chave, quando configurada, para criar usuarios via Admin API e evitar bloqueios do fluxo publico de `signUp`. Nunca use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## Configuracao de autenticacao

1. Crie um projeto no Supabase.
2. Copie a Project URL para `NEXT_PUBLIC_SUPABASE_URL`.
3. Copie a anon key ou publishable key para `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Configure `DATABASE_URL` e `DIRECT_URL` com a connection string Postgres do Supabase.
5. Configure `NEXT_PUBLIC_APP_URL=http://localhost:3000` em desenvolvimento.
6. No painel Supabase, va em `Authentication > URL Configuration`.
7. Use `Site URL: http://localhost:3000` em desenvolvimento.
8. Adicione `http://localhost:3000/**` em Redirect URLs.
9. Para confirmacao de e-mail SSR, use `/auth/callback` como redirect padrao. Se customizar o template de e-mail com `token_hash`, a rota `/auth/confirm` tambem esta implementada.
10. Rode as migrations para criar tabelas, RLS, Storage e Realtime.
11. Reinicie `npm run dev` apos alterar `.env.local`.

Fluxo esperado:

- Com confirmacao de e-mail desativada, o signup cria a sessao e redireciona para `/onboarding`.
- Com confirmacao de e-mail ativada, o signup mostra `Conta criada. Verifique seu e-mail para confirmar o cadastro.`
- Depois do callback OAuth/e-mail, o app faz upsert do `Profile` e redireciona para `/onboarding` ou `/dashboard`.

## Pagamentos (Stripe)

Fluxo: landing (`/cadastro?plano=basico|completo`) -> cadastro (e-mail ou Google) -> `/assinar` -> Stripe Checkout -> `/assinar/sucesso` -> onboarding -> dashboard. Sem assinatura ativa, o dashboard, o onboarding e todas as rotas de IA ficam bloqueados.

- Produtos/precos no Stripe com lookup keys `easy_basic_monthly` (R$ 26,90) e `easy_full_monthly` (R$ 46,90). Trocar o preco no Stripe nao exige deploy.
- Webhook: `POST /api/stripe/webhook` (eventos de checkout, assinatura e fatura). Cada evento e processado uma vez (`stripe_events`).
- Portal do cliente (cartao, troca de plano, cancelamento, faturas): `/dashboard/assinatura`.
- Garantia de 7 dias: botao em `/dashboard/assinatura` reembolsa tudo e encerra na hora.
- Limites diarios de IA por plano: Basico 25 geracoes / 60 mensagens; Completo 60 / 150 (variaveis `AI_DAILY_*`).
- A assinatura fica na tabela `subscriptions` (RLS: o aluno so le a propria; so o servidor grava).

Variaveis: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, opcionais `BILLING_EXEMPT_EMAILS` e `BILLING_REQUIRED=false`. Sem `STRIPE_SECRET_KEY` a cobranca fica desligada e o app funciona como antes.

Teste local do webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook` (use o `whsec_` mostrado pela CLI). O retorno do checkout tambem confirma o pagamento sem depender do webhook.

## Personalização, vídeos e redação

- **Onboarding em 5 etapas** (`/onboarding`, refazível em Configurações): motivo do estudo (escola, ENEM/vestibular, concurso, faculdade, intercâmbio/idioma, certificação, conhecimento livre), detalhes de cada caso (série, prova, banca, curso, idioma e nível QECR), rotina (dias, horário), matérias ou habilidades, dificuldades e jeito preferido de explicação. Fica em `profiles.personalization` e alimenta quiz, simulado, flashcards, plano, chat e redação (`src/lib/learner-profile.ts`, `src/lib/exam-style.ts`).
- **Vídeos do YouTube** (`/dashboard/arquivos`): o aluno cola o link (vídeo público, trecho de até 60 min); a IA assiste em segundo plano e gera anotações com marcas de tempo. Quiz, flashcards e simulado do vídeo apontam o minuto de origem, que vira link. Mesmo vídeo/trecho é reaproveitado sem nova leitura (`src/lib/youtube.ts`, `POST /api/videos`).
- **Redação pela grade oficial do Enem** (cartilha do INEP): níveis 0/40/80/120/160/200 por competência, nota zero, tangenciamento, direitos humanos e os 5 elementos da proposta (`src/lib/enem-essay.ts`).
- Custo de IA por aluno: `docs/consumo-ia.md`.

## Banco

```bash
npm run db:generate
npx prisma validate
npx prisma migrate deploy
```

O schema Prisma esta em `prisma/schema.prisma`. O seed nao cria dados artificiais; o app usa dados reais por usuario.

## Desenvolvimento

```bash
npm run dev
npm run lint
npm run build
```

## Deploy na Vercel

1. Configure as variaveis de ambiente na Vercel.
2. Conecte o repositorio.
3. Use o comando de build padrao `npm run build`.
4. Garanta que `postinstall` rode `prisma generate`.

As rotas protegidas validam sessao Supabase em `src/proxy.ts` (Next.js 16) e as API routes revalidam o usuario no servidor.
