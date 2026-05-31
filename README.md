# Easy Education

MVP SaaS educacional com Next.js, Supabase, Prisma e Gemini. Slogan: **Estude melhor, nao apenas mais.**

## Stack

- Next.js App Router + TypeScript strict
- Tailwind CSS + shadcn/ui
- Supabase Auth, PostgreSQL e Storage
- Prisma ORM
- Google Gemini via `@google/genai`
- `pdf-parse`, React Hook Form, Zod, Recharts, Lucide, Sonner

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
