# Consumo de IA por aluno — Easy Education

Atualizado em 10/10/2026 (recursos novos da próxima fase na seção "Recursos novos (10/10/2026)"). Baseado nos tokens medidos nos testes reais desta versão e nos preços públicos do Gemini (plano pago, por 1 milhão de tokens). Os limites de cada plano vivem em `src/lib/plans.ts` e o custo real de cada chamada é gravado em `ai_call_logs` (tela interna: `/dashboard/interno/custos`).

## Premissas

| Item | Valor |
|---|---|
| Modelos usados | Desde 09/10/2026, por plano (`src/lib/gemini.ts`): todos os alunos usam primeiro o `gemini-2.5-flash-lite` (US$ 0,10 / 0,40), com reserva no `gemini-3.1-flash-lite` (US$ 0,25 / 1,50) e no `gemini-3.5-flash-lite`. Só no Completo a redação e o plano de estudos usam o `gemini-2.5-flash` (US$ 0,30 / 2,50). Tarefas internas (classificar questões) usam o `gemini-2.5-flash`. |
| Preço | US$ 0,30 por 1M tokens de entrada; US$ 2,50 por 1M tokens de saída (ver `src/lib/ai-cost.ts`; `gemini-2.5-flash-lite` usa US$ 0,10 / 0,40) |
| Câmbio usado | R$ 5,50 por dólar (ajuste com `USD_BRL` na tela interna e em `ai-cost`/docs se mudar) |
| Margem | +15% em toda operação, para os pedidos-reserva que o app dispara quando um modelo demora |
| Tokens de raciocínio | contados como saída (é assim que o Google cobra) |
| Vídeo | ~100 tokens por segundo em resolução baixa. A documentação do Google diz que a leitura por link do YouTube está "em preview, sem cobrança"; aqui considero que será cobrada, por segurança |
| PDF e TXT | O texto é extraído no servidor, sem custo de IA. Foto passa pela IA. |

## Custo por operação (modelos antigos, antes de 09/10/2026)

Referência histórica, medida com o gemini-2.5-flash e o gemini-3.5-flash-lite. Os valores atuais estão em "Pior caso", mais abaixo.

| Operação | US$ | R$ |
|---|---|---|
| Quiz de 10 questões | 0,010 | 0,05 |
| Quiz de 10 questões de um material (PDF, foto ou vídeo) | 0,012 | 0,07 |
| Simulado de 20 questões | 0,020 | 0,11 |
| Flashcards (12 cartões) | 0,004 | 0,02 |
| Flashcards (30 cartões) | 0,010 | 0,05 |
| Correção de redação (grade do Enem, com raciocínio) | 0,011 | 0,06 |
| Leitura da foto da redação | 0,003 | 0,01 |
| Plano de estudos | 0,006 | 0,03 |
| Mensagem no chat | 0,003 | 0,02 |
| Foto de material (caderno, apostila) | 0,003 | 0,02 |
| Vídeo de 20 minutos | 0,044 | 0,24 |
| Vídeo de 60 minutos | 0,123 | 0,67 |
| **Questão do banco: resolver e classificar (lote, uma vez só)** | **0,005** | **0,026** (medido em 27 questões reais: US$ 0,128 no total) |
| Simulado do concurso (30 questões) | 0,030 | 0,17 |
| Quiz de 20 questões de um material (o maior permitido) | 0,024 | 0,13 |

As provas anteriores do ENEM não gastam IA a cada acesso: a classificação e a resolução comentada são feitas uma vez, em lote, e ficam salvas. Fazer simulado de prova anterior e revisar custa zero de IA, em qualquer plano.

## Limites por plano (valores atuais de `plans.ts`, 09/10/2026)

Os limites foram recalculados para o teto de custo combinado: **Gratuito até R$ 1, Básico até R$ 4,90 e Completo até R$ 14,90 de IA por aluno por mês**.

**Atualização 10/10/2026:** o plano Gratuito foi removido. Todo aluno começa com 7 dias grátis do Básico ou do Completo (pagamento autorizado no início) e depois paga. As linhas e colunas do Gratuito abaixo ficam só como histórico; sem assinatura nem teste em vigor, toda rota de IA recusa (402).

| Recurso | Gratuito | Básico (R$ 19,90) | Completo (R$ 34,90) |
|---|---|---|---|
| Chat com IA | bloqueado | 12/dia | 30/dia |
| Redação (texto ou foto) | bloqueada | 3/semana | 1/dia |
| Envio de arquivos | bloqueado | 2/dia, 15 MB | 5/dia, 50 MB |
| Vídeos do YouTube | bloqueado | 1/dia (com legenda até 60 min; sem legenda, 20 min) | 3/dia (com legenda até 60 min; sem legenda, 30 min) |
| Plano de estudos (refazer) | bloqueado (o 1º, do onboarding, é gerado) | 1/semana | 3/semana |
| Trilha | bloqueada | liberada | liberada |
| Quiz por IA | bloqueado | 10/dia | 20/dia |
| Flashcards por IA (decks) | bloqueado | 25/dia | 50/dia |
| Simulado por IA, em **questões** (inclui o do concurso e o da ETEC) | bloqueado | 50 questões/dia (era 45; cabe o simulado da ETEC) | 90 questões/dia |
| Resumo do dia corrigido (`day_summary`) | 1/semana | 1/dia | 1/dia |
| Simulados de provas anteriores do ENEM | livre | livre | livre |

**Atualização 09/10/2026 (noite):** o Gratuito ficou só com o que não gasta IA (provas anteriores do ENEM, desempenho e revisão) e os planos pagos ganharam 7 dias grátis. Quizzes, flashcards e simulados foram ampliados a pedido do produto. Com esses limites, usar tudo todos os dias passaria do teto de custo; quem garante o teto (Básico R$ 4,90 e Completo R$ 14,90 por mês) é o teto mensal de uso justo no servidor. Questões reaproveitadas do banco compartilhado não gastam IA, então o uso real fica bem abaixo do pior caso. A tabela abaixo é da versão anterior dos limites.

## Pior caso: usar todo o limite, todos os dias

**Vídeos:** desde 09/10/2026 o app lê primeiro a legenda do YouTube (sem custo, `src/lib/youtube-transcript.ts`) e a IA só resume o texto. Medido no vídeo de 14 min usado nos testes: US$ 0,0028 (antes, assistindo o vídeo, ~US$ 0,01 a 0,03). Sem legenda, a IA assiste o vídeo, limitado ao trecho do plano. A conta abaixo considera vídeos com legenda.

Cada operação no maior tamanho permitido (quiz de 20 questões de um material, 30 flashcards, simulado de 30 questões, redação por foto, todo arquivo como foto, vídeo no trecho máximo), mês de 30 dias, limite semanal × 4,29. Tokens estimados com folga (o chat medido em 09/10 usou ~1.000 de entrada e ~270 de saída; a conta usa 4.000 e 800, para cobrir o histórico da conversa).

| Operação | Tokens (entrada / saída) | Custo no 2.5-flash-lite | No 2.5-flash (só Completo: redação e plano) |
|---|---|---|---|
| Mensagem no chat | 4.000 / 800 | US$ 0,0008 | — |
| Correção de redação | 3.500 / 3.000 | US$ 0,0018 | US$ 0,0098 |
| Leitura de foto | 1.500 / 800 | US$ 0,0005 | — |
| Plano de estudos | 2.500 / 3.500 | US$ 0,0019 | US$ 0,0109 |
| Quiz de 20 questões de um material | 12.000 / 4.500 | US$ 0,0035 | — |
| Flashcards (30) | 9.000 / 3.500 | US$ 0,0026 | — |
| Simulado de 30 questões | 9.000 / 6.500 | US$ 0,0040 | — |
| Vídeo de 20 min (a IA assiste, vídeo sem legenda) | 120.000 / 3.500 | US$ 0,0154 | — |
| Vídeo de 30 min (a IA assiste, vídeo sem legenda) | 180.000 / 4.000 | US$ 0,0225 | — |
| Vídeo de 60 min pela legenda (padrão desde 09/10) | 15.000 / 4.000 | US$ 0,0036 | — |

| Plano | Pior caso estimado | Teto mensal no servidor | Teto combinado |
|---|---|---|---|
| Gratuito | US$ 0,10 ≈ **R$ 0,58** | US$ 0,17 ≈ R$ 0,94 | R$ 1,00 |
| Básico | US$ 0,84 ≈ **R$ 4,60** | US$ 0,85 ≈ R$ 4,68 | R$ 4,90 |
| Completo | US$ 2,59 ≈ **R$ 14,24** | US$ 2,62 ≈ R$ 14,41 | R$ 14,90 |

O teto mensal (`safety.monthlyCostUsd` em `plans.ts`) soma o custo real gravado em `ai_call_logs` e bloqueia o uso de IA ao chegar nele (volta no dia 1º). Ele é conferido antes de cada uso, então a última operação do mês pode passar um pouco (no máximo uma operação, cerca de US$ 0,02 a 0,04 com um vídeo). Ele garante o teto mesmo quando a IA cai no modelo de reserva, que é mais caro: nesse caso o aluno só chega no teto alguns dias antes.

**Importante (09/10/2026):** a chave do Gemini ainda está no plano grátis do Google, e o `gemini-2.5-flash` e o `gemini-2.5-flash-lite` estão sem cota. Hoje tudo responde pelo `gemini-3.1-flash-lite` (reserva), que custa cerca de 2,5 vezes mais. Com o faturamento ativado, o modelo mais barato volta a ser o principal.

## Recursos novos (10/10/2026)

Mesmas premissas da tabela de pior caso (flash-lite, +15%). Entre parênteses, o custo se a chamada cair no modelo de reserva `gemini-3.1-flash-lite` (US$ 0,25 / 1,50), como acontece hoje sem o faturamento do Gemini.

| Recurso | Tokens (entrada / saída) | Custo por uso | Pior caso por aluno por mês | Limite |
|---|---|---|---|---|
| Resumo do dia corrigido (1.7) | 2.700 / 1.200 (inclui 512 de raciocínio) | US$ 0,0009 (0,0025) | Básico e Completo US$ 0,027 | `day_summary` |
| Flashcards a partir do quiz (1.5), 13 cartões + conferência | 4.700 / 1.400 | US$ 0,0012 (0,0036) | dentro do limite `ai_flashcards` que já existia | `ai_flashcards` (1 deck) |
| Flashcards dos erros do resumo do dia | 0 | zero (os cartões já vêm na correção) | zero | — |
| Simulado da ETEC, 50 questões A a E | ~15.000 / 11.000 + conferência | US$ 0,008 (0,03) | coberto pelo limite de questões | `ai_simulado` (50) |
| Alternativa E (questões de 5 alternativas) | +~5% de saída por questão | desprezível | — | — |
| Roteiro, estado do bloco, anotações | 0 | zero | zero | — |
| "Ouvir" com a voz do navegador | 0 | zero | zero | — |
| Portão de qualidade (matéria no plano B gera com `gemini-2.5-flash`) | igual à geração | ~5x a geração no flash-lite (quiz de 20: US$ 0,015 em vez de 0,003) | só nas matérias reprovadas; o teto mensal continua valendo | — |
| Conferência com outro modelo (`GEMINI_VERIFY_MODEL=gemini-2.5-flash`, desligado) | 2.000 / 1.100 por 10 questões | +US$ 0,003 por quiz de 10 (quase dobra o quiz) | ligar só se a medição do 1.2 mostrar ganho | — |
| Avaliação de confiabilidade (scripts/eval, uma vez) | — | < US$ 0,15 por rodada completa | não é por aluno | — |

**Efeito no pior caso dos planos:** Básico +US$ 0,027 (resumo do dia) +US$ 0,02 (5 questões de simulado a mais por dia) ≈ US$ 0,89, um pouco acima do teto mensal de US$ 0,85, que segura o gasto (o aluno extremo chega no teto 1 ou 2 dias antes). Completo +US$ 0,027, dentro do teto. Gratuito +US$ 0,004, dentro do teto de US$ 0,17.

**Não implementado, para referência (1.9, Gemini TTS):** Gemini 3.8 Flash-Lite TTS, US$ 0,50 por 1M de entrada e US$ 6 por 1M de tokens de áudio (25 por segundo), dobrando em 1/1/2027 (página oficial de preços, conferida em 10/10/2026). 3 min de áudio ≈ US$ 0,027 (US$ 0,054 em 2027). Um por dia custaria US$ 0,81 por mês: quase o teto do Básico. Se for feito, gerar uma vez, guardar no Storage e limitar a 3 por semana no Básico.

## Como acompanhar o custo real

1. Abra `/dashboard/interno/custos` (só para e-mails em `ADMIN_EMAILS`, ou `BILLING_EXEMPT_EMAILS` se a primeira não existir). A tela mostra, no mês corrente: custo por plano, **o aluno que mais gastou em cada plano**, a média por aluno, os 15 alunos mais caros e o custo por recurso.
2. A pergunta "quanto custa, por mês, o usuário que mais usa o plano Completo?" é a coluna "Aluno que mais usa" da linha Completo. A query equivalente:

```sql
WITH per_user AS (
  SELECT plan, user_id, SUM(cost_usd) AS cost
  FROM ai_call_logs
  WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    AND user_id IS NOT NULL
  GROUP BY plan, user_id
)
SELECT plan, MAX(cost) AS max_usd, AVG(cost) AS avg_usd, COUNT(*) AS alunos FROM per_user GROUP BY plan;
```

3. Compare com o painel do Google AI Studio nas primeiras semanas. O custo gravado é estimado a partir dos tokens que o Google devolve em cada resposta, com a margem de 15%.

## Pendências de custo

- **Faturamento da chave do Gemini:** a chave usada nos testes bateu a cota do plano grátis do Google durante a classificação em lote (erro 429, "exceeded your current quota"). Ative o faturamento no Google AI Studio antes de lançar; sem isso, vários alunos ao mesmo tempo estouram a cota e a leitura de vídeo do YouTube fica limitada.
- **Classificar o resto do banco:** o lote piloto foi parcial por causa dessa cota (ver `docs/fontes-questoes.md`). Classificar as ~2.700 questões do ENEM custa na ordem de R$ 70 (R$ 0,026 por questão).
