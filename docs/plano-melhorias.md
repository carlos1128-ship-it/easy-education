# Easy Education — auditoria do código e plano de melhorias

Data: 06/10/2026. Base: código atual (branch `main`, commit `b4c23e3`) e o roadmap enviado (P0, P1, P2). Nada foi implementado ainda. A implementação só começa depois da sua aprovação deste plano.

---

## 1. Auditoria do código (resumo)

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma + PostgreSQL (Supabase), Supabase Auth e Storage, Stripe, Gemini (`@google/genai`), Vercel (região de São Paulo).

**Onde cada coisa mora**
| Assunto | Arquivo |
|---|---|
| Chamadas ao Gemini, modelos, prazo de 19 s, partes paralelas | `src/lib/gemini.ts` |
| Prompts e esquema de quiz | `src/lib/quiz-generation.ts`, `src/lib/quiz-questions.ts` |
| Simulado e simulado semanal | `src/lib/simulado.ts` |
| Flashcards (geração) e revisão | `src/lib/flashcard-generation.ts`, `src/app/api/flashcards/[id]/review/route.ts` |
| Plano semanal e "Iniciar" | `src/lib/study-plan-generation.ts`, `src/lib/study-start.ts` |
| Trilha e troféus | `src/lib/study-trail.ts` |
| Estilo por objetivo | `src/lib/exam-style.ts` (uma frase por objetivo) |
| Redação | `src/app/api/essay/correct/route.ts`, `transcribe/route.ts` |
| Chat que age | `src/lib/chat-agent.ts` |
| Notificações (só dentro do app) | `src/lib/notifications.ts` |
| Assinatura e limites | `src/lib/billing.ts`, `src/lib/ai-quota.ts` |

**O que a auditoria revelou e muda o plano**
1. **Não existe o conceito de "tópico".** `Quiz` guarda só `subject` e `title`; `QuizQuestion` não tem tópico, origem nem tempo. O painel "matérias com mais erros" na verdade lista matérias, não tópicos. **Quase tudo de P1 (domínio do aluno, simulado de síntese, "o que você está esquecendo") depende de criar esse dado.**
2. **A letra A–D está fixa em vários pontos**: `LETTERS` em `quiz-questions.ts`, o esquema enviado à IA (`enum A–D`, exatamente 4 alternativas), o formulário (5 a 20 questões) e o `validators.ts`. Suportar A–E, certo/errado ou resposta numérica mexe nesses quatro lugares e no `QuizRunner`.
3. **O flashcard não sabe de onde veio.** `Flashcard` não aponta para a questão errada nem para o arquivo ou vídeo de origem. "Erro vira flashcard" precisa dessa ligação.
4. **A revisão espaçada é simplificada** (3 notas, intervalo = intervalo × facilidade). Funciona, mas não é o SM-2 completo que a landing cita.
5. **SAT na redação:** o formulário já envia sempre `"ENEM"`. O SAT sobrevive só no validador (`z.enum(["ENEM","SAT"])`), em um texto em `app-data.ts` e no objetivo "SAT/Processo internacional" do onboarding. **P0.2 é pequeno** (meio dia), não uma refatoração.
6. **Não há infraestrutura para P0.5:** sem service worker, sem provedor de e-mail, sem biblioteca de push, sem rotinas agendadas (`vercel.json` não tem `crons`). Existe só o `manifest`.
7. **Não há testes** (nem script `test`) **nem analytics.** Vou refatorar geração, esquema e perfis de prova; sem testes mínimos, isso é arriscado.
8. **A geração roda dentro da requisição** (prazo de 19 s). Simulado completo de ENEM (90 questões) com validação não cabe nesse modelo: exige job em segundo plano.
9. **Faltam Termos de Uso, Política de Privacidade e canal de contato.** Bloqueia push e e-mail com consentimento, e é exigência para cobrar de menores.

---

## 2. Onde discordo ou ajusto o roadmap

1. **"Nota estimada do ENEM" (P0.1, P1.2, P1.5).** A nota real do ENEM usa a Teoria de Resposta ao Item, que depende de quais itens o aluno acertou e da dificuldade calibrada de cada um. Questões geradas por IA não têm essa calibração. Mostrar "720 pontos" seria inventar um número. **Recomendo** exibir **% de acerto por área e uma tendência**, e só chamar de "estimativa" uma faixa grosseira, com aviso. Isso é coerente com a sua regra 3 (não inventar dados).
2. **Segunda checagem por IA (P0.3) tem custo e latência.** Dobra as chamadas e pode estourar o prazo de 19 s. Proponho: checar em paralelo dentro do mesmo prazo para quizzes de até 20 questões; para simulados longos, validar no job em segundo plano. Também não pega erros em que as duas IAs erram igual, por isso o botão "Reportar" e a auditoria por amostragem continuam necessários.
3. **Calibração da redação (P0.4) depende de dados que não temos.** Preciso de um conjunto de redações corrigidas por humanos, com direito de uso. Sem isso, entrego o mecanismo (faixa, degraus de 40 pontos, comparador) mas não a calibração.
4. **Web push no iPhone** só funciona com o app instalado na tela inicial (PWA). Muitos estudantes usam iPhone. **O e-mail é o canal confiável**; o push é complemento. WhatsApp exige conta Business e custo por mensagem; fica só preparado.
5. **Rotinas agendadas:** o simulado noturno cabe numa rotina diária. Mas "avisar no horário que o aluno escolheu" exige rotina frequente (a Vercel limita por plano; preciso confirmar o seu). Alternativa: agrupar avisos em poucas janelas fixas (manhã, tarde, noite).
6. **Ordem:** o roadmap põe P0.1 (perfis) antes de qualquer mudança de dados. Eu criaria antes uma base de dados (P0.0), porque perfis, validação, vídeo e simulado de síntese dependem dela.
7. **YouTube (P1.3):** o roadmap afirma que a entrada de URL do Gemini aceita só vídeos públicos e está em preview. Vou conferir isso na documentação oficial no começo da fase, antes de gastar com a integração. A localização do minuto de origem depende de a IA devolver tempos corretos: precisa de verificação por amostragem.
8. **PIX (P2):** já verifiquei com a documentação do Stripe. Conta brasileira **não** tem Pix recorrente (Pix Automático indisponível no Brasil), então assinatura mensal por Pix não existe. Possível: venda avulsa por Pix ou boleto (1, 3 ou 6 meses sem renovação automática).

---

## 3. Plano por fase

Esforço em dias de trabalho de desenvolvimento, incluindo testes. São estimativas; as marcadas com ⚠ dependem de decisões ou dados seus.

### Fase 0 — fundação (antes de qualquer P0 visível)
| Item | O que faz | Esforço | Risco |
|---|---|---|---|
| F0.1 Testes mínimos | Vitest para esquemas, SM-2, trilha, perfis, validação de questão | 1–2 | baixo |
| F0.2 Eventos de analytics | Tabela própria de eventos (sem terceiros por enquanto) com os eventos da seção 6 do roadmap | 2 ⚠ | privacidade de menores |
| F0.3 Páginas legais | Termos de Uso, Privacidade, contato, links no rodapé e no cadastro | 1 + revisão jurídica ⚠ | texto precisa de revisão por advogado |
| F0.4 Base de dados | `topic` e `skill` em questão, `sourceType`/`sourceRef` (arquivo, vídeo, minuto), ligação flashcard ← questão, `ReportedQuestion`, `QuestionCheck` | 2–3 | migração aditiva, baixo |

### P0
| Item | Esforço | Dependências e riscos |
|---|---|---|
| **P0.2** Remover SAT da redação, do validador e dos textos; objetivo SAT vira "modo básico" | 0,5 | nenhum. Também ajustar o documento de produto |
| **P0.1** Perfis de prova (ENEM completo + Genérico; estrutura pronta para os outros): formato de questão, tamanho de simulado, rubrica, matérias. Remove o A–D fixo | 5–7 | mexe em quatro pontos da geração e no `QuizRunner`; simulado de 90 questões exige job em segundo plano |
| **P0.3** Validação: esquema, segunda checagem em paralelo, botão "Reportar", quarentena, amostragem | 4–5 | custo de IA aproximadamente dobra por questão; latência |
| **P0.4** Redação: degraus de 40, faixa de nota, aviso, ferramenta de calibração (QWK e erro médio) | 3 + 3 ⚠ | calibração real depende de corpus de redações humanas |
| **P0.5** Notificações: e-mail primeiro (provedor, domínio, descadastro), depois web push (service worker, chaves VAPID), horário de silêncio, limite de frequência | 4–5 | iPhone só com PWA instalado; precisa de domínio e remetente; rotinas agendadas ⚠ |

### P1
| Item | Esforço | Observação |
|---|---|---|
| **P1.1** Domínio do aluno: domínio por tópico (acertos recentes ponderados por tempo), risco de esquecimento, erro vira flashcard, ajuste do plano | 6–8 | depende de F0.4; é o coração do "ciclo fechado" |
| **P1.2** Simulado semanal de síntese (40/30/20/10 ajustável, job noturno, relatório, composição mostrada) | 5–7 | depende de P0.1, P0.3, P1.1 e de rotina agendada |
| **P1.6** Modo prova (cronômetro real, sem gabarito durante, revisão no final) | 3–4 | também corrige a promessa da landing do simulado "no tempo de prova" |
| **P1.4** Onboarding pós-pagamento: checklist com ações reais, dicas na primeira vez de cada tela, tour opcional | 3–4 | depende dos eventos de F0.2 |
| **P1.5** Painel: tendência, "o que você está esquecendo", recomendação com botão de ação | 3 | depende de P1.1 |
| **P1.3** YouTube: link → quiz, flashcards, simulado, com limite por plano, cache por vídeo, trecho, minuto de origem, bloco do plano | 7–9 | depende de F0.4; confirmar API; custo por hora de vídeo |

**Total aproximado:** Fase 0 ≈ 6–8 dias; P0 ≈ 17–22 dias; P1 ≈ 27–35 dias. Cerca de 2,5 a 3 meses de trabalho contínuo no conjunto, sem contar revisões suas.

### Ordem recomendada
1. Fase 0 inteira + P0.2 (barato, remove risco de credibilidade).
2. P0.1 (ENEM e Genérico) e P0.3.
3. P0.5 (e-mail primeiro) e P0.4.
4. P1.1 → P1.6 → P1.2.
5. P1.4 e P1.5.
6. P1.3 por último: é o recurso mais caro e de menor diferencial isolado.

---

## 4. Decisões que preciso de você

1. **Nota do ENEM:** concorda em mostrar **% de acerto por área e tendência**, em vez de uma nota em pontos?
2. **Redações humanas:** você tem ou consegue um conjunto de redações já corrigidas (e com direito de uso) para calibrar a IA? Sem isso, P0.4 entrega só o mecanismo.
3. **Analytics:** tabela própria no nosso banco (simples, sem enviar dados a terceiros) ou ferramenta externa (PostHog, Vercel Analytics)? Há menores de idade entre os alunos.
4. **E-mail:** você tem um domínio próprio (para o remetente e para o endereço de contato)? Qual provedor prefere (Resend é o mais simples)?
5. **Plano da Vercel:** qual é? Define a frequência das rotinas agendadas (simulado noturno e avisos).
6. **Textos legais:** você tem advogado ou modelo para Termos e Privacidade? Posso redigir um rascunho, mas ele precisa de revisão.
7. **Perfis de prova:** além do ENEM, qual vem primeiro: faculdade, concurso, vestibular específico ou SAT?
8. **Orçamento de IA:** há teto de custo por aluno por mês? A segunda checagem e o simulado completo aumentam o gasto; preciso do teto para dimensionar.
9. **PIX/boleto:** quer que eu proponha o pacote avulso (1/3/6 meses) agora, ou deixamos para depois do P0?

---

## 5. Primeiro passo se você aprovar

Entrego, nesta ordem e cada um em seu commit: F0.1 (testes), P0.2 (SAT fora), F0.4 (esquema de dados, só aditivo, sem apagar nada) e, só então, o P0.1. Cada entrega vem com o que mudou, como testar, riscos e o que ficou pendente.
