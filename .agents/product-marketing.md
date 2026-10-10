# Product Marketing Context

**Document version:** v2
**Last updated:** 2026-10-04

> Rascunho montado a partir do código e da landing. Itens marcados com [PRECISA] dependem de dados reais (clientes, métricas, limites dos planos).

## Product Overview
**One-liner:** Plataforma de estudos com IA para qualquer estudante: transforma o material do aluno em quiz, flashcards, simulado, plano de estudos e correção de redação.
**What it does:** O aluno envia PDF ou foto da matéria (ou só escolhe o assunto) e recebe questões com explicação em cada alternativa, flashcards com revisão espaçada (variação simples do SM-2, com 3 notas), simulados e um plano de estudos diário. A redação é corrigida por texto ou foto da folha, com nota de 0 a 1000 e comentário por competência. Um chat com IA tira dúvidas e cria quiz, simulado, flashcards e plano direto da conversa.
**Product category:** Ferramenta de estudos com IA, geral (como o aluno procura: "app para estudar", "gerar questões do PDF", "flashcards com IA", "corretor de redação").
**Product type:** SaaS B2C, web responsivo (celular e computador).
**Business model:** Assinatura mensal, sem plano gratuito: Básico R$ 19,90/mês e Completo R$ 34,90/mês, os dois com 7 dias grátis (cartão cadastrado no início; Pix Automático depois). Fonte única dos preços: `src/lib/plans.ts`. Stripe em modo de teste (10/10/2026).

## Target Audience
**Target customers:** Qualquer estudante: ensino médio (provas da escola, ENEM, vestibular), faculdade (disciplinas e provas) e concurseiros. Não nichar a comunicação em ENEM; citar ENEM só onde o recurso segue esse modelo (correção de redação).
**Decision-makers:** O próprio aluno; em muitos casos os pais pagam (pagador ≠ usuário).
**Primary use case:** Saber o que revisar e praticar com o próprio material, sem montar tudo à mão.
**Jobs to be done:**
- "Quero treinar com questões da matéria que estou estudando agora."
- "Quero minha redação corrigida hoje, não daqui a uma semana."
- "Quero abrir o app e já saber o que estudar."
**Use cases:**
- Véspera de prova: gerar quiz da apostila e revisar os erros.
- Rotina semanal: plano diário, simulado semanal automático, flashcards do dia.
- Redação: escrever ou fotografar a folha e reescrever pela competência mais fraca.

## Problems & Pain Points
**Core problem:** Muito material e pouco tempo; o aluno não sabe por onde começar nem o que já esqueceu.
**Why alternatives fall short:**
- Cursinho/plataforma de videoaula: conteúdo genérico, não usa o material do aluno; prática separada da teoria.
- Correção de redação humana: demora dias e custa por redação.
- Montar flashcards e resumos à mão: toma o tempo que deveria ir para a prática.
**What it costs them:** Horas relendo capítulos inteiros; dúvidas que só aparecem na prova; pontos perdidos na redação.
**Emotional tension:** Ansiedade com a data da prova, culpa por não estudar o suficiente, sensação de estudar muito e render pouco.

## Competitive Landscape
**Direct:** Plataformas de preparação para o ENEM com banco de questões e correção de redação — falham por usarem questões genéricas e correção demorada/limitada.
**Secondary:** ChatGPT e afins — servem, mas exigem saber pedir, não guardam histórico de desempenho nem agendam revisão.
**Indirect:** Estudar sozinho com apostila, resumos e Anki — funciona, mas é lento de montar e não corrige redação.

## Differentiation
**Key differentiators:**
- Usa o material do próprio aluno (PDF ou foto) para gerar a prática.
- Correção de redação na hora, por texto ou foto, nas 5 competências do ENEM.
- Revisão espaçada automática: o app decide quando cada cartão volta.
- Chat que age: cria quiz, simulado, flashcards e plano e leva o aluno até eles.
- Plano diário com cronômetro: "Iniciar" abre a atividade pronta do bloco.
- Mascote (coruja) e sons que reagem a acertos, erros e conclusão.
**Why customers choose us:** Tudo em um lugar, a partir do que o aluno já tem, com retorno imediato.

## Objections
| Objection | Response |
|-----------|----------|
| "É caro / não sei se vou usar" | Menos de R$ 1 por dia no Básico; 7 dias de garantia (direito de arrependimento); cancela quando quiser. |
| "A IA erra?" | Pode errar; toda questão traz explicação e a redação mostra o motivo de cada nota, para o aluno conferir. |
| "Preciso ter apostila em PDF?" | Não. Dá para escolher a matéria ou mandar foto. |
| "Substitui professor?" | Não. Complementa: prática e correção rápidas entre as aulas. |

**Anti-persona:** Quem quer só videoaula passiva; quem não vai praticar.

## Switching Dynamics
**Push:** Correção de redação demorada; apostila parada; estudo sem rumo.
**Pull:** Quiz da própria apostila em minutos; redação corrigida na hora; plano pronto todo dia.
**Habit:** Reler e grifar; resumos à mão; videoaulas.
**Anxiety:** Pagar e não usar; IA dar resposta errada; ter que aprender mais um app.

## Customer Language
**How they describe the problem:** [PRECISA: frases reais de alunos — entrevistas, reviews, DMs]
**Words to use:** apostila, matéria, revisar, questão, simulado, redação, nota, competência, ENEM, vestibular, plano de estudos.
**Words to avoid:** "grátis" (produto pago), "revolucionário", "potencialize", "desbloqueie", jargão técnico sem explicação (ex.: "SM-2" sozinho).
**Glossary:**
| Term | Meaning |
|------|---------|
| Revisão espaçada (SM-2) | Algoritmo que agenda cada flashcard para voltar pouco antes de ser esquecido |
| Competências | Os 5 critérios de correção da redação do ENEM, 0 a 200 cada |
| Ofensiva | Sequência de dias seguidos estudando |

## Brand Voice
**Tone:** Próximo e direto, de colega que já passou pelo ENEM.
**Style:** Frases curtas, concretas, segunda pessoa ("você"); sem exclamações em excesso.
**Personality:** Encorajador, prático, honesto, leve (a coruja dá o toque divertido).

## Proof Points
**Metrics:** [PRECISA: número de alunos, questões geradas, redações corrigidas]
**Customers:** [PRECISA]
**Testimonials:** [PRECISA: depoimentos reais e autorizados — seção desligada até lá]
**Value themes:**
| Theme | Proof |
|-------|-------|
| Prática com o próprio material | Upload de PDF/foto gera quiz e flashcards |
| Retorno imediato | Correção de redação e explicação por alternativa na hora |
| Constância | Plano diário, ofensiva, notificações, simulado semanal |

## Goals
**Business goal:** Converter visitantes em assinantes pagos e reter mês a mês.
**Conversion action:** Clicar em "Assinar" → cadastro → onboarding (plano criado) → primeiro quiz.
**Current metrics:** [PRECISA: conversão da landing, ativação, churn]

## Changelog
*Newest first. One line per revision: what changed and why.*
- v2 (2026-10-04) — Reposicionado de "foco em ENEM" para "ferramenta geral para todo estudante", a pedido do dono; ENEM fica só na correção de redação.
- v1 (2026-10-04) — Initial context, auto-drafted from the codebase and landing copy.
