# Consumo de IA por aluno — Easy Education

Atualizado em 09/10/2026. Baseado nos tokens medidos nos testes reais desta versão e nos preços públicos do Gemini (plano pago, por 1 milhão de tokens). Os limites de cada plano vivem em `src/lib/plans.ts` e o custo real de cada chamada é gravado em `ai_call_logs` (tela interna: `/dashboard/interno/custos`).

## Premissas

| Item | Valor |
|---|---|
| Modelos usados | `gemini-3.5-flash-lite` (quiz, simulado, flashcards, vídeo) e `gemini-2.5-flash` (chat, redação, plano, banco de questões). |
| Preço | US$ 0,30 por 1M tokens de entrada; US$ 2,50 por 1M tokens de saída (ver `src/lib/ai-cost.ts`; `gemini-2.5-flash-lite` usa US$ 0,10 / 0,40) |
| Câmbio usado | R$ 5,50 por dólar (ajuste com `USD_BRL` na tela interna e em `ai-cost`/docs se mudar) |
| Margem | +15% em toda operação, para os pedidos-reserva que o app dispara quando um modelo demora |
| Tokens de raciocínio | contados como saída (é assim que o Google cobra) |
| Vídeo | ~100 tokens por segundo em resolução baixa. A documentação do Google diz que a leitura por link do YouTube está "em preview, sem cobrança"; aqui considero que será cobrada, por segurança |
| PDF e TXT | O texto é extraído no servidor, sem custo de IA. Foto passa pela IA. |

## Custo por operação

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
| Questão nova gerada por IA (gerar + verificar às cegas) | ~0,010 | ~0,06 (estimado: são 2 chamadas; ainda não medido em produção) |

O banco de questões não gasta IA a cada acesso: a classificação e a resolução comentada são feitas uma vez, em lote, e ficam salvas. Responder, revisar e fazer simulado do banco custa zero de IA, em qualquer plano.

## Limites por plano (valores atuais de `plans.ts`)

| Recurso | Gratuito | Básico (R$ 19,90) | Completo (R$ 34,90) |
|---|---|---|---|
| Chat com IA | 3/dia | 20/dia | 50/dia |
| Redação (texto) | 1/semana | 7/semana | 3/dia |
| Redação por foto | bloqueada | dentro do limite de redações | dentro do limite de redações |
| Envio de arquivos | 1/dia, 5 MB | 2/dia, 15 MB | 10/dia, 50 MB |
| Vídeos do YouTube | bloqueado | 3/dia | 10/dia |
| Plano de estudos | 1/semana | 3/semana | 1/dia |
| Trilha | bloqueada | liberada | liberada |
| Quiz por IA | bloqueado | 3/dia | 15/dia |
| Flashcards por IA | bloqueado | 3/dia | 15/dia |
| Simulado por IA | bloqueado | 1/semana | 1/dia |
| Questão nova por IA | bloqueada | 5/dia | 30/dia |

## Pior caso: usar todo o limite, todos os dias

Somando as operações acima (custo por operação × limite × 30 dias; vídeo de 20 min, foto só quando o arquivo é imagem):

| Plano | Pior caso sem teto mensal | Teto mensal de uso justo | Preço |
|---|---|---|---|
| Gratuito | ≈ R$ 2,80 | US$ 0,60 ≈ R$ 3,30 | R$ 0 |
| Básico | ≈ R$ 58 | US$ 3,00 ≈ R$ 16,50 | R$ 19,90 |
| Completo | ≈ R$ 226 | US$ 5,50 ≈ R$ 30,25 | R$ 34,90 |

Sem teto mensal, um aluno que usasse todos os limites todos os dias daria prejuízo nos planos pagos (o gargalo são os vídeos, o chat e as questões geradas). Por isso existem **dois tetos de segurança por aluno**, aplicados no servidor (`consumeFeature`, `src/lib/usage.ts`) e editáveis em `plans.ts`:

- **Teto diário** (soma dos pesos dos usos e custo estimado em dólares no dia): Gratuito US$ 0,10; Básico US$ 0,50; Completo US$ 1,50.
- **Teto mensal de uso justo** (custo estimado de IA no mês): Gratuito US$ 0,60; Básico US$ 3,00; Completo US$ 5,50. Ao chegar nele, o aluno vê "teto de uso justo deste mês", com a data em que volta (dia 1º).

Com os tetos, o pior caso por aluno fica limitado ao valor da última coluna da tabela acima. O Completo, no pior caso absoluto, deixa cerca de R$ 4,65 de margem antes da taxa do Stripe (≈ 4% + R$ 0,39 por cobrança de cartão no Brasil; confirmar na sua conta). Isso só acontece com abuso; o uso típico é bem menor.

## Perfis de uso típico (por mês)

| Perfil | Uso no mês | Custo |
|---|---|---|
| **Leve** (estuda 3 vezes por semana) | 8 quizzes, 2 simulados, 6 decks, 2 redações, 1 plano, 60 mensagens, 2 vídeos de 20 min, 3 fotos | **R$ 2,65** |
| **Médio** (quase todo dia) | 25 quizzes, 4 simulados, 15 decks, 4 redações, 2 planos, 200 mensagens, 6 vídeos de 20 min, 8 fotos | **R$ 8,13** |
| **Intenso** (todo dia, uso pesado) | 60 quizzes, 8 simulados, 30 decks, 10 redações, 4 planos, 600 mensagens, 10 vídeos de 20 min + 5 de 60 min, 20 fotos | **R$ 23,76** |

Leve e Médio cabem folgados nos tetos do Básico. O Intenso passa do teto do Básico (R$ 16,50) e cabe no Completo (R$ 30,25), que é o plano certo para ele.

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
