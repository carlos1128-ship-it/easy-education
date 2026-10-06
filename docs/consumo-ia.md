# Consumo de IA por aluno — Easy Education

Outubro de 2026. Baseado nos tokens medidos nos testes reais desta versão e nos preços públicos do Gemini (plano pago, por 1 milhão de tokens).

## Premissas

| Item | Valor |
|---|---|
| Modelos usados | `gemini-3.5-flash-lite` (quiz, simulado, flashcards, vídeo) e `gemini-2.5-flash` (chat, redação, plano). Os dois custam igual. |
| Preço | US$ 0,30 por 1M tokens de entrada; US$ 2,50 por 1M tokens de saída |
| Câmbio usado | R$ 5,50 por dólar (ajuste se mudar) |
| Margem | +15% em toda operação, para os pedidos-reserva que o app dispara quando um modelo demora |
| Vídeo | ~100 tokens por segundo em resolução baixa (medido: 10 min = 55 mil tokens; 30 min = 164 mil). A documentação diz que a leitura por link do YouTube está "em preview, sem cobrança"; aqui considero que será cobrada, por segurança |
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
| **Vídeo de 20 minutos** | 0,044 | 0,24 |
| **Vídeo de 60 minutos** | 0,123 | 0,67 |

O mesmo vídeo e trecho é lido uma vez só: se outro aluno (ou o mesmo) adicionar o mesmo link, as anotações são reaproveitadas sem custo.

## Custo por aluno por mês

| Perfil | Uso no mês | Tokens | Custo |
|---|---|---|---|
| **Leve** (estuda 3 vezes por semana) | 8 quizzes, 2 simulados, 6 decks, 2 redações, 1 plano, 60 mensagens, 2 vídeos de 20 min, 3 fotos | 0,5 milhão | **R$ 2,65** |
| **Médio** (quase todo dia) | 25 quizzes, 4 simulados, 15 decks, 4 redações, 2 planos, 200 mensagens, 6 vídeos de 20 min, 8 fotos | 1,7 milhão | **R$ 8,13** |
| **Intenso** (todo dia, uso pesado) | 60 quizzes, 8 simulados, 30 decks, 10 redações, 4 planos, 600 mensagens, 10 vídeos de 20 min + 5 de 60 min, 20 fotos | 5,6 milhões | **R$ 23,76** |

**Leitura:** os perfis Leve e Médio custam de 10% a 30% do preço do Básico (R$ 26,90). O Intenso custa cerca de 51% do Completo (R$ 46,90); no Básico chegaria a 88% do preço, e os limites diários atuais permitem isso. É um dos motivos do teto mensal recomendado abaixo. A taxa do Stripe no Brasil é de aproximadamente 4% + R$ 0,39 por cobrança de cartão (confirmar na sua conta).

## Pior caso: usar todo o limite, todos os dias

| Plano | Limite diário hoje | Custo máximo no mês | Preço |
|---|---|---|---|
| Básico | 25 gerações, 60 mensagens, 3 vídeos | R$ 141 (R$ 81 sem vídeo) | R$ 26,90 |
| Completo | 60 gerações, 150 mensagens, 10 vídeos | R$ 399 (R$ 197 sem vídeo) | R$ 46,90 |

Os limites atuais são **diários**. Um aluno que use tudo, todo dia, dá prejuízo. É raro (equivale a gerar 25 quizzes por dia por um mês), mas é o risco de abuso: uma conta compartilhada ou um script.

## Recomendações

1. **Adicionar um teto mensal**, além do diário. Exemplo que deixa o pior caso perto do preço:
   - Básico: 150 gerações, 600 mensagens e 10 vídeos por mês.
   - Completo: 400 gerações, 1.500 mensagens e 30 vídeos por mês.

   Isso não afeta os perfis Leve e Médio, e o Intenso caberia no Completo.
2. **Mostrar ao aluno quanto já usou** (ex.: "120 de 150 gerações este mês") para evitar surpresa quando o limite chegar.
3. **Ativar o faturamento da chave do Gemini** no Google AI Studio. No plano grátis, poucos alunos ao mesmo tempo estouram a cota, e a leitura de vídeo do YouTube fica limitada a 8 horas por dia.
4. **Acompanhar o custo real** no painel do Google AI Studio nas primeiras semanas e comparar com esta tabela. O app já registra, nos logs do servidor, os tokens de cada vídeo lido (`[video.process]`).
5. Os números de limite na landing ("limite padrão" e "limite maior") podem ser preenchidos com os tetos mensais escolhidos.

Os limites diários atuais estão em `src/lib/ai-quota.ts` e `src/lib/youtube.ts` e podem ser mudados por variável de ambiente sem mexer no código (`AI_DAILY_GENERATIONS_BASIC`, `AI_DAILY_VIDEOS_BASIC` e similares).
