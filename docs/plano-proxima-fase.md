# Easy Education — próxima fase: plano, o que foi feito e o que falta

10/10/2026. Base: branch `redesign-frontend` (commit `9bae3e8`), os documentos do projeto e os relatórios `Claude outputs/relatorio-concorrente-simplestudy.md` e `Claude outputs/mascote-estilo-e-adaptacao.md`.

O pedido original era entregar só o plano e esperar aprovação. Depois veio a instrução de trabalhar até o fim sem parar. Então fiz as duas coisas: este documento é o plano (com custo, risco e decisões), e os itens que dependiam só de código **já estão implementados** no working tree, sem commit e **sem a migration aplicada no banco**. Cada decisão que era sua tem um padrão escolhido por mim, listado na seção 2, fácil de trocar.

---

## 0. Antes de publicar este código (bloqueante)

1. **Aplicar a migration `prisma/migrations/000011_proxima_fase`** no Supabase. Ela é só aditiva (tabelas novas e colunas opcionais). **Sem ela, as telas Plano, Início e Trilha quebram**, porque leem a tabela nova `study_block_runs`. Não apliquei porque o projeto tem um banco só (produção).
   ```bash
   npx prisma migrate deploy
   ```
2. Definir na Vercel: `NEXT_PUBLIC_SUPPORT_EMAIL` (contato no rodapé, nos Termos e na Privacidade) e `NEXT_PUBLIC_LEGAL_ENTITY` (razão social e CNPJ ou nome do responsável). Sem o e-mail, o rodapé não mostra contato.
3. **Ativar o faturamento da chave do Gemini antes de publicar a Política de Privacidade.** O texto diz que o conteúdo enviado à IA não é usado para treino; isso só vale na API paga. No plano grátis do Google, vale o contrário.
4. Pedir a um advogado a revisão de `src/content/legal.ts` (Termos e Privacidade). É um rascunho fiel ao que o app faz, não um parecer jurídico.

---

## 0.1 Plano Gratuito removido (decisão de 10/10/2026)

- Não existe mais plano gratuito. `PlanTier` é só `basic | full` (`src/lib/plans.ts`, com `TRIAL_DAYS = 7`).
- O aluno se cadastra, escolhe Básico ou Completo e cadastra o pagamento; os 7 primeiros dias são grátis (uma vez por aluno; quem já testou assina direto).
- Sem assinatura ou teste em vigor: `getStudentOrRedirect` manda para `/assinar`, e `requireTier`/`consumeFeature` recusam as rotas de IA com 402 (`subscription_required`).
- **Contas antigas sem assinatura** (as que estavam no Gratuito) passam a cair em `/assinar` ao entrar. Contas da equipe: `BILLING_EXEMPT_EMAILS`.
- **Pix Automático, só a estrutura:** `src/lib/payment-methods.ts` (formas de pagamento, com o Pix como "em breve"), `method` na rota de checkout (recusa o Pix por enquanto), coluna `subscriptions.provider` (padrão `stripe`) na migration 000011, e a escolha da forma de pagamento na tela de planos. Falta escolher o gateway; o passo a passo está no comentário do arquivo.

## 1. Plano por fase, com o que foi entregue

Esforço em dias de desenvolvimento. "Feito" = código, testes e documentação prontos aqui; falta só aplicar a migration e publicar.

### Parte 0: bloqueios de lançamento

| Item | Situação | Arquivos | Esforço | Risco |
|---|---|---|---|---|
| Termos de Uso e Política de Privacidade (LGPD, menores), links no rodapé e no cadastro | **Feito** (rascunho para revisão jurídica). Cadastro exige aceite; versão e data do aceite ficam nos metadados da conta. Google: aviso de aceite abaixo do botão | `src/content/legal.ts`, `src/components/legal/legal-page.tsx`, `src/app/(public)/termos`, `privacidade`, `src/lib/site.ts`, `auth-forms.tsx`, `api/auth/signup/route.ts`, `validators.ts`, `landing-page.tsx` | 1 + revisão jurídica | texto sem revisão de advogado |
| E-mail de contato na landing e nos documentos | **Feito no código** (lê `NEXT_PUBLIC_SUPPORT_EMAIL`). No recibo: o Stripe usa o e-mail de suporte configurado no painel dele | `src/lib/site.ts` | 0,1 | falta você criar o e-mail |
| Stripe em modo real | **Seu.** Recriar os produtos com lookup keys `easy_basic_monthly` (R$ 19,90) e `easy_full_monthly` (R$ 34,90), portal e webhook na conta real; trocar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` | painel do Stripe e da Vercel | 0,5 | preço no Stripe diferente de `plans.ts` faz o checkout recusar (de propósito) |
| Login com Google | **Seu** (Supabase → Authentication → Providers → Google, com Client ID e Secret do Google Cloud). O botão já existe | painel | 0,3 | — |
| Faturamento do Gemini | **Seu** (Google AI Studio → Billing) | painel | 0,1 | sem isso, o custo real é ~2,5x o planejado (cai no modelo de reserva) |
| Contradição de preços | **Feito.** R$ 26,90/46,90 trocados por R$ 19,90/34,90 em `docs/produto-easy-education.md`, `.agents/product-marketing.md` e `README.md` | docs | — | — |
| Promessas da landing | **Feito.** Os flashcards de exemplo agora mostram os 3 botões reais (Não sabia, Mais ou menos, Sabia bem) e o FAQ não fala mais em SM-2. O exemplo de simulado agora mostra o simulado real com cronômetro (provas anteriores do ENEM, 90 questões). Simulado de 30+ questões já existe (até 90 por IA) | `src/content/landing.ts`, `landing-page.tsx` | 0,3 | — |

### Fase 1: plano de estudos (1.3 → 1.1 → 1.4)

| Item | Situação | Arquivos | Migration | Esforço | Custo de IA |
|---|---|---|---|---|---|
| **1.3** Semana começa hoje | **Feito.** Ordem calculada no fuso de Brasília; "Hoje" e "Amanhã" no lugar do nome do dia; teste da virada da meia-noite. A única tela que lista a semana é o Plano (Início mostra só hoje; Trilha mostra níveis) | `src/lib/study-plan.ts` (+ teste), `dashboard/plano/page.tsx` | — | 0,5 | zero |
| **1.1** Bloco inicia uma vez e fecha ao concluir | **Feito.** Estado no servidor (`study_block_runs`): sem registro = pendente; Iniciar cria "em andamento"; concluído não tem botão e a API responde **409**. "Continuar" reabre a **mesma** atividade, sem IA. Só blocos de hoje podem ser iniciados. Uma regra única de "concluído" para bloco e trilha | `src/lib/study-completion.ts` (+ teste), `src/lib/study-runs.ts`, `api/study-plan/start`, `api/study-plan/run`, `study-session-button.tsx`, `study-trail.ts`, `dashboard/page.tsx` | `study_block_runs`, `flashcards.last_reviewed_at` | 3 | zero (evita gerar IA de novo) |
| **1.4** Roteiro fixo com checks automáticos | **Feito.** Desktop: coluna lateral fixa (não cobre o conteúdo). Celular: barra recolhível abaixo do cabeçalho. Os checks vêm de eventos: tempo registrado, atividade terminada, cartões ou questões revisados, anotação no bloco. Sobrevive a recarregar (vem do servidor) e atualiza a cada 30 s, ao trocar de página e ao voltar para a aba | `study-roadmap.ts` (+ teste), `study-run-provider.tsx`, `study-run-panel.tsx`, `layout.tsx`. Removidos `study-timer.tsx`, `study-roadmap.tsx` (componente) e `active-study.ts` | — | 2 | zero |

**Definição de "concluído" (adotada):** o bloco termina quando a atividade termina (quiz ou simulado respondido até o fim, todos os cartões do deck revisados depois do início do bloco, redação corrigida depois do início, sessão de provas anteriores terminada) **ou** quando os minutos **registrados** no bloco cobrem o planejado. Minutos registrados = tempo do cronômetro (com pausas), não o tempo de relógio desde o clique, para não contar o aluno que iniciou e saiu. O dia termina quando todos os blocos do dia terminam ou os minutos do dia são cumpridos.

**Mudança de comportamento a saber:** antes, um dia com 2 blocos contava como concluído com uma atividade só. Agora precisa dos dois blocos (ou dos minutos do dia). A trilha fica um pouco mais exigente, mas coerente com o botão.

Também corrigi um erro antigo: `study-stats.ts` e `study-start.ts` usavam a meia-noite do servidor (UTC) como "hoje", então das 21h às 0h de Brasília o app achava que já era o dia seguinte (ofensiva e reaproveitamento do bloco). Agora tudo usa Brasília.

### Fase 2: A a E e ETEC (1.8)

| Item | Situação | Arquivos | Esforço | Custo de IA |
|---|---|---|---|---|
| Alternativas A a E | **Feito.** O número de alternativas vem do estilo da prova: ENEM, ETEC, Fuvest e bancas FCC, Vunesp, FGV e Cesgranrio usam 5; o resto 4. Esquema enviado à IA, validador, conferência às cegas, banco compartilhado (só serve o formato pedido) e prompts. O `QuizRunner` já mostrava A a E. Questões antigas (4 alternativas) continuam funcionando | `quiz-questions.ts` (+ testes), `checked-questions.ts`, `question-pool.ts`, `question-quality.ts`, `quiz-generation.ts`, `simulado.ts` | 1,5 | +~5% por questão (uma alternativa a mais) |
| ETEC no onboarding | **Feito.** Objetivo "Vestibulinho da ETEC", série, matérias padrão (Português, Matemática, Ciências, História, Geografia), estilo de 9º ano interdisciplinar e contextualizado | `learner-profile.ts`, `exam-style.ts`, `onboarding-form.tsx` | 0,5 | — |
| Simulado no formato da prova | **Feito.** 50 questões, A a E, um por dia, com cronômetro de 4 h que avisa quando o tempo acaba (não trava, para o aluno terminar o treino) | `api/simulados/etec`, `etec-card.tsx`, `simulados/page.tsx`, `simulados/[id]/page.tsx`, `quiz-runner.tsx` | 1 | ~US$ 0,008 por simulado |

Como o ENEM já lidava com 5 alternativas: as provas anteriores usam outro componente (`QuestionRunner`, banco oficial), que sempre aceitou A a E. O limite estava só na geração por IA.

**Formato da ETEC conferido:** 50 questões objetivas, 4 horas, conteúdo da BNCC do Fundamental II, confirmado em reportagens de 2026 que citam o Manual do Candidato ([CNN Brasil](https://www.cnnbrasil.com.br/educacao/vestibulinho-das-etecs-abre-inscricoes-para-1o-semestre-de-2026/), [ABCdoABC](https://abcdoabc.com.br/vestibulinho-etecs-2026-domingo/)). Não consegui abrir o manual em si; reconfira em vestibulinho.etec.sp.gov.br. As especializações técnicas têm 30 questões, como você disse.

**Limite mudado:** simulado por IA no Básico passou de 45 para **50 questões por dia**, para caber um simulado da ETEC. Efeito no pior caso: +US$ 0,02 por mês, coberto pelo teto mensal.

### Fase 3: confiabilidade (1.2)

**Feito o mecanismo; falta a medição.** Detalhes e comandos em `docs/confiabilidade-ia.md`.

- `scripts/eval/verifier.ts`: resolvedor às cegas × gabarito oficial, por área, com intervalo de confiança, comparando dois modelos (quantas erram com a mesma letra).
- `scripts/eval/generate-sample.ts`: amostra gerada pelo caminho do app, guardada fora do alcance dos alunos.
- Tela interna `/dashboard/interno/questoes`: nova seção com Correta/Incorreta.
- `scripts/eval/report.ts`: relatório por área e matéria; só grava no portão com `--reviewer`.
- Portão `src/lib/ai-quality-gate.ts`: matéria abaixo de 90% (com 30+ revisadas) passa a gerar com o modelo mais forte.
- `GEMINI_VERIFY_MODEL`: liga a conferência com outro modelo, se a medição mostrar que vale.

Escolhi o "modelo mais forte" como plano B, e não "trocar pelo banco oficial": o banco oficial só cobre o ENEM 2019 a 2023 e só serve a quem estuda para o ENEM.

Esforço: 2 dias de código (feito) + 0,5 dia para rodar + **o tempo do revisor** (120 questões ≈ 4 a 6 horas).

### Fase 4: flashcards do quiz e anotações (1.5, 1.6)

| Item | Situação | Arquivos | Migration | Custo de IA |
|---|---|---|---|---|
| **1.5** "Criar flashcards para revisar" no resultado | **Feito.** Opção, não automático. Erradas primeiro (um cartão por erro, até 10) e depois 3 de conceito. Cada cartão grava a questão de origem (`source_quiz_question_id`) e o tipo (`erro`/`conceito`); a revisão mostra "Veio de uma questão que você errou". Deck do mesmo assunto dos últimos 7 dias: oferece "Adicionar ao deck". Gasta 1 deck do limite `ai_flashcards` (devolve se falhar) | `quiz-flashcards.ts` (+ teste), `api/flashcards/from-quiz`, `quiz-flashcards-offer.tsx`, `quiz-runner.tsx`, `flashcard-review.tsx` | `flashcards.source_*` | ~US$ 0,0012 por pedido |
| **1.6** Anotações | **Feito.** Modelo `Note` com RLS. Botão "Anotar" na explicação de cada questão de quiz, nas questões do banco oficial e nas etapas do roteiro; tela "Minhas anotações" com filtro por matéria, editar e apagar; entra na busca global. Anotação no bloco marca a etapa "fechar explicando" | `notes.ts` (+ teste), `api/notes`, `note-button.tsx`, `note-item-actions.tsx`, `dashboard/anotacoes`, `busca/page.tsx`, `question-tools.tsx`, `app-data.ts` | `notes` | zero |

Ainda não: anotar dentro do resumo de arquivo (a tela de arquivos não tem uma visão de leitura do resumo; o modelo já aceita `fileId`). E o "transformar minhas anotações em quiz ou flashcards" (só planejado): reutiliza `createFlashcardDeckForUser` com o texto das anotações como material, gasta `ai_flashcards`/`ai_quiz`, cerca de 1 dia.

### Fase 5: fechar o dia (1.7)

**Feito.** `/dashboard/fechar-dia`, links no Plano e no roteiro (ao concluir um bloco).

- Contador; 200 a 5.000 caracteres validados no cliente e no servidor (Zod).
- A IA recebe o resumo e **só o que o aluno fez**: blocos, quizzes, acerto, até 15 questões erradas, minutos por matéria, cartões revisados. Sem estudo registrado no dia, a rota recusa.
- Correção guardada com o dia (`day_summaries`, um por dia): o que está certo, o que está errado (com o trecho e a correção), o que faltou, o que revisar amanhã.
- Cada conceito errado já vem como cartão; "Transformar os erros em flashcards" cria o deck **sem nova chamada à IA**.
- Opcional, fora da ofensiva. Recompensa: **ainda não implementada** (ver decisão 2).
- `FeatureKey` `day_summary`: Básico 1 por dia, Completo 1 por dia. ~US$ 0,0009 por correção.

Arquivos: `day-summary-rules.ts` (+ teste), `day-summary.ts`, `api/day-summary`, `api/day-summary/flashcards`, `day-summary-form.tsx`, `dashboard/fechar-dia`, `plans.ts`, `plan-comparison.ts`.

### Fase 6: áudio (1.9)

**Feito o mínimo de custo zero da leitura A:** botão "Ouvir a correção" no fechamento do dia, com a voz do navegador (Web Speech API, pt-BR), e o texto continua na tela (transcrição). Componente reutilizável `src/components/audio/speak-button.tsx`.

**Gemini TTS: não implementado, por custo.** Conferi na página oficial de preços ([ai.google.dev/pricing](https://ai.google.dev/gemini-api/docs/pricing)): o modelo é o **Gemini 3.8 Flash-Lite TTS**, US$ 0,50 por 1M de tokens de entrada e US$ 6 por 1M de tokens de áudio, 25 tokens por segundo, e os preços dobram em 1/1/2027. Sua conta está certa: 3 min = 4.500 tokens ≈ **US$ 0,027** (≈ US$ 0,054 a partir de 2027). Um áudio por dia no Básico daria US$ 0,81 por mês, quase o teto inteiro do plano (US$ 0,85). Se for fazer: guardar no Storage, gerar uma vez por material, `FeatureKey` `audio_summary` com 3 por semana no Básico e 1 por dia no Completo. Esforço: 2 a 3 dias.

**Leitura B** (o aluno fala o resumo, a IA transcreve e corrige) é barata: áudio de entrada custa ~US$ 0,50 por 1M de tokens no flash-lite; 3 min ≈ US$ 0,003. O custo maior é de produto (gravação no celular, permissões, menores). 2 dias se você escolher.

### Parte 2: concorrente (SimpleStudy): avaliação e proposta

| # | Proposta | Recomendação | Esforço | Impacto |
|---|---|---|---|---|
| 1 | **Plano anual** | **Fazer agora, depois do Stripe real.** Ver a conta abaixo | 1,5 | alto (caixa e preço) |
| 2 | Conteúdo pré-gerado e compartilhado | **Mudou de papel (10/10/2026): sem plano Gratuito, serve para baixar o custo do teste de 7 dias e dos planos pagos.** Gerar ~30 questões por assunto do ENEM pelo pipeline atual (poucos dólares no total) e servir pelo `SharedQuestion`, depois da 1ª medição do 1.2 | 3 | médio (custo) |
| 3 | SEO por questão do ENEM | **Fazer, com cuidado.** A CC BY-ND permite publicar a questão **sem alteração** e com crédito; a resolução comentada é conteúdo nosso, separado. Antes: copiar as imagens para o nosso Storage (hoje apontam para o enem.dev) e confirmar com advogado os textos de terceiros dentro das provas. Só questões com resolução validada | 4 a 6 | alto, mas lento (meses) |
| 4 | Pais como pagadores | **Fazer a parte barata agora:** botão "Peça para seus pais" que compartilha o link do plano por WhatsApp. A página em que o responsável paga pelo filho exige ligar a assinatura a outra conta: 3 a 4 dias, depois | 0,5 + 3 | médio |
| 5 | E-mail de retenção | **Fazer depois do lançamento.** Precisa de domínio, provedor (Resend), rotina agendada (`crons` no `vercel.json`) e descadastro. Com menores, só e-mails de serviço (ofensiva, cartões vencendo), nada de marketing | 3 a 4 | alto na retenção |
| 6 | Indicação / embaixadores | **Depois de ter pagantes.** Concordo com você | 3 | — |
| 7 | Garantia de 14 dias | **Não recomendo.** O app já tem 7 dias grátis + 7 de garantia. Com 14 de garantia, alguém usa 21 dias de IA e pede o dinheiro de volta (e a taxa do Stripe não volta no reembolso). Proposta: comunicar honestamente "14 dias para testar sem risco: 7 grátis + 7 de garantia" | 0,1 | — |
| 8 | Segurança | **Conferido.** `npm run verify:backend` passou; nenhum e-mail fixo no código; telas internas respondem 404 para quem não é admin; nenhuma documentação de API (Swagger/OpenAPI) é servida; variáveis públicas só têm Supabase, URL do app, e-mail de suporte e nome legal. Atenção: os caminhos das telas internas aparecem no código do navegador (só os nomes; o conteúdo é protegido) | feito | — |
| 9 | Não copiar | Concordo: biblioteca genérica como produto principal, "50% OFF" permanente (risco no CDC e no Procon) e números inflados | — | — |

**Conta do plano anual (custo de IA × receita):**

| | Mensal | Anual proposto | Por mês no anual | Teto de IA por mês | Teto ÷ receita |
|---|---|---|---|---|---|
| Básico | R$ 19,90 | **R$ 149,00** (−38%) | R$ 12,42 | R$ 4,90 | 39% |
| Completo | R$ 34,90 | **R$ 289,00** (−31%) | R$ 24,08 | R$ 14,90 | 62% |

O teto mensal de uso justo continua valendo mês a mês no anual, então o pior caso fica coberto. No Completo, porém, o aluno que usa tudo consome 62% da receita (antes de impostos e da taxa do Stripe). Por isso o desconto do Completo é menor. O Básico anual fica em R$ 12,42 por mês, igual ao Advanced anual do concorrente (R$ 12,49). Implementação: lookup keys `easy_basic_yearly` e `easy_full_yearly`, escolha mensal/anual na página de planos e `planFromPrice` reconhecendo as duas.

### Parte 3: mascote (só especificação)

**Componente novo `OwlRive`**, trocado dentro de `src/components/mascot/owl-mascot.tsx` mantendo a API (`mood`, `size`, `message`):

1. Arquivo único `public/mascote/coruja.riv` (meta: menos de 150 KB), servido com cache longo.
2. Carrega quando a coruja entra na tela (`IntersectionObserver`, sem os 5 s de espera do concorrente). Enquanto carrega, com `prefers-reduced-motion` ou com erro: a pose parada atual (`*-parada.webp`).
3. Pacote: `@rive-app/react-canvas` se tiver os hooks de Data Binding; senão `@rive-app/react-webgl2`. **Conferir na documentação antes**, o relatório também não confirmou.
4. View model `Coruja`: `mood` (enum com os 8 valores de `OwlMood`), triggers `acerto`, `erro`, `concluido`, boolean `falando` (ligado enquanto há `message`), e `olharX`/`olharY` ou listener de ponteiro para os olhos.
5. State machine em 3 camadas: Corpo (idle + poses, blend de 150 a 250 ms), Olhos (piscar a cada 2 a 6 s, sobrescrito por poses de olho fechado), Efeitos (reações e acessórios).
6. Nova API opcional, sem quebrar a atual: `useOwlEvents()` devolve `{ acerto(), erro(), concluido() }` ligados à coruja da tela.

**Onde disparar os triggers:**

| Evento | Onde | Trigger |
|---|---|---|
| Resposta certa / errada | `quiz-runner.tsx` (onde hoje toca o som) | `acerto` / `erro` |
| Bloco concluído (1.1) | `study-run-panel.tsx`, quando o run vira `concluido` | `concluido` |
| Etapa do roteiro marcada (1.4) | `study-run-panel.tsx`, quando um check novo aparece | `acerto` |
| Dia fechado (1.7) | `day-summary-form.tsx` (a coruja já aparece na correção) | `concluido` + `mood` conforme os erros |

**Afastar da Duo:** manter óculos, moletom com capelo, penacho e pés laranja; contorno fino em `brand-deep`; branco + azul da marca (a Duo é verde, sem contorno); proporções menos "bola", olhos com pálpebra e óculos sempre visíveis; nada de verde. Não usar a coruja em todo card, só onde há emoção.

Esforço: arte e rig (freelancer ou você no Rive) + 2 dias de código. Depois de lançar.

---

## 2. Suas decisões pendentes (com o padrão que adotei)

| # | Decisão | Padrão aplicado no código | Para trocar |
|---|---|---|---|
| 1 | O que é "concluído" (1.1) | Atividade terminada **ou** minutos registrados ≥ planejado; dia = todos os blocos ou minutos do dia | `src/lib/study-completion.ts` |
| 2 | Resumo do dia no Gratuito (1.7) | **Resolvido (10/10/2026): o plano Gratuito foi removido.** Recompensa ainda não definida: sugiro um troféu "Dia fechado" a cada 7 resumos | — |
| 3 | Áudio A ou B (1.9) | **A com a voz do navegador** (custo zero). Gemini TTS só se você aceitar o custo e o limite | — |
| 4 | Quem faz a revisão humana (1.2) | Ninguém definido: **nenhum número foi publicado** | `scripts/eval/report.ts --reviewer` |
| 5 | Preço e desconto do anual | Proposta: Básico R$ 149/ano, Completo R$ 289/ano (seção Parte 2) | criar no Stripe |
| 6 | Garantia 14 dias | Mantida em 7 (+ 7 dias grátis) | — |
| 7 | Dados do responsável legal e e-mail de contato | Vazios: preencha as variáveis | `NEXT_PUBLIC_LEGAL_ENTITY`, `NEXT_PUBLIC_SUPPORT_EMAIL` |
| 8 | Idade mínima | **12 anos** nos Termos; 12 a 17 com conhecimento do responsável, que contrata a assinatura | `src/content/legal.ts` |

---

## 3. Onde discordo de você

1. **"Concluído" por minutos planejados:** concordo, mas contando minutos do cronômetro, não o tempo desde o clique. Senão o aluno inicia, sai e o bloco se conclui sozinho.
2. **90% como critério:** é piso. A meta deveria ser 95%. E o portão por matéria exige 30 revisões **por matéria** (umas 400 no total). Comece pelo relatório por área.
3. **Verificador da mesma família:** concordo que é um risco. Mas ligar um verificador mais forte em produção dobra o custo do quiz (+US$ 0,003 por quiz de 10). Só ligue se a medição mostrar que ele pega erros que o atual não pega.
4. **Garantia de 14 dias:** não. Já são 14 dias sem risco (7 grátis + 7 de garantia); 14 de garantia viram 21 dias de IA de graça para quem quer abusar.
5. **Gemini TTS para resumo diário:** caro demais para uso diário (um áudio por dia come o teto do Básico). A voz do navegador resolve 80% com custo zero.
6. **Promessas da landing:** em vez de implementar o SM-2 com 4 notas, ajustei a landing ao app (3 notas). Trocar o algoritmo muda o agendamento de todos os cartões existentes, e não há evidência de ganho para o aluno que justifique isso agora.
7. **Ordem:** concordo com a sua, com um ajuste: o plano anual (Parte 2.1) deve entrar junto com o Stripe real, não depois do áudio. É o que mais mexe no caixa.
8. **ETEC:** o público tem 14 e 15 anos. Além da Política, os textos de venda para esse público devem falar com o responsável (quem paga). Não importei provas anteriores da ETEC: o Centro Paula Souza publica as provas, mas a licença não está clara; conferir antes, como foi feito com o INEP.

---

## 4. Testes e verificação feitos

- `npm test`: 108 testes passando (10 arquivos), incluindo os novos: `study-plan.test.ts` (virada da meia-noite), `study-completion.test.ts` (bloco, dia, roteiro e ofensiva em Brasília), `quiz-questions.test.ts` (A a E, ETEC), `ai-quality.test.ts`, `notes.test.ts`, `quiz-flashcards.test.ts`, `day-summary.test.ts`, `plans.test.ts` (limites novos).
- `npx tsc --noEmit`, `npm run lint` e `npm run build`: sem erros.
- `npm run verify:backend`: passou.
- No navegador (dev): `/termos`, `/privacidade`, rodapé da landing com os links, cartão de flashcards com 3 botões, caixa de aceite no cadastro.
- **Não testado ponta a ponta:** as telas que dependem das tabelas novas (Plano com o estado do bloco, roteiro, anotações, fechar o dia, flashcards do quiz), porque a migration não foi aplicada no único banco do projeto. Depois de aplicar, teste: iniciar um bloco → sair → "Continuar" abre o mesmo quiz → terminar o quiz → o bloco vira "Concluído" e a etapa "Praticar" ganha o check.
