# Bateria de testes de ponta a ponta — 10/10/2026

Feita com `scripts/qa/battery.ts` contra o app local (código novo) usando o banco e a chave do Gemini de produção, com contas de teste `@easyeducation.test` (assinatura de teste no Completo). Dados brutos: `docs/qa/bateria-2026-10-10-18-27.json` (ENEM) e `docs/qa/bateria-2026-10-10-18-34.json` (ETEC, concurso, escola). Contas: `scripts/qa/.qa-accounts.local.json` (fora do git). Para apagar tudo: `npx tsx --env-file=.env.local scripts/qa/cleanup.ts --confirm`.

## O que foi exercitado

| Perfil | O que rodou |
|---|---|
| ENEM, 3º ano, intermediário, dificuldade em interpretação e contas | onboarding; **20 quizzes de 20 questões até o limite do dia recusar (21º → 429)**; 3 quizzes respondidos inteiros pela rota real; simulado por IA de **90**; pedido acima do limite (→ 429); provas anteriores do ENEM 1º dia (90), 2º dia (90) e completa (180); deck de 30 flashcards; flashcards a partir do quiz; bloco do plano; 3 anotações; fechar o dia; 13 páginas |
| Vestibulinho da ETEC, 9º ano | o mesmo, com **simulado ETEC de 50** (rodado à parte para não esbarrar no limite do simulado de 90) |
| Concurso Soldado PM-SP, Vunesp | quizzes, simulado do concurso (30), bloco completo até "concluído" e travado (409) |
| Escola, 1º ano (4 alternativas) | quizzes de 4 alternativas, simulado de 90 |

Total: **1.003 questões geradas**; 913 conferidas por uma segunda IA (gemini-2.5-flash) às cegas.

## Qualidade das questões

| Medida | Resultado |
|---|---|
| A outra IA discordou do gabarito | 49 de 913 (5,4%) |
| Desempate por um juiz com raciocínio longo (39 julgadas; 10 ficaram sem juiz por cota) | **8 gabaritos errados de verdade** (≈ **0,9%** das questões); 31 vezes o app estava certo e a outra IA errou |
| Onde ficaram os erros | contas (Matemática 3, Química 1, Física 1) e gramática de concurso (3) |
| Juiz por amostra (60 questões, 15 por perfil): nível e estilo do perfil | **60 de 60 adequados**; 1 com erro de conteúdo (concentração 0,2 × 0,4 mol/L) |
| Alternativas no formato certo | ENEM, ETEC e Vunesp com 5 (A–E); escola com 4 — 100% |

**Limite desta medição:** é IA conferindo IA. Erros em que as duas concordam não aparecem. O número só vale como "piso de erro"; a medição com revisor humano continua pendente (`docs/confiabilidade-ia.md`).

## Problemas encontrados e o que foi corrigido

| # | Problema | Evidência | Correção |
|---|---|---|---|
| 1 | **Gabarito viciado em letra** | 400 questões de quiz: A 116, B 138, C 95, D 33, **E 18** (chutando B, o aluno acertava 35%) | `balanceCorrectLetters`: o servidor redistribui as alternativas para o gabarito cair por igual (simulado ETEC depois da correção: 10 por letra) e corrige as letras citadas na explicação |
| 2 | **Gabarito errado com a explicação calculando outro valor** | chuveiro: gabarito R$ 75,00, explicação chega a R$ 37,50 | `explanationContradictsAnswer` descarta e refaz; exatas passam a ser conferidas pelo modelo mais forte (`isExactScience`) |
| 3 | **Perfil do aluno dentro do enunciado** | "Um estudante de Medicina, ao revisar Literatura para o ENEM..." | prompt proíbe citar aluno, curso, série, prova ou objetivo no enunciado, nas alternativas e na explicação |
| 4 | Explicação em inglês na questão de Inglês do ENEM | "1. Define paradox..." | explicação sempre em português |
| 5 | **Questões quase repetidas no mesmo simulado** | dois chuveiros (5500 W e 5400 W), "água e óleo" duas vezes | filtro de semelhança (enunciado + alternativas; enunciado longo sozinho); ~5% das questões passam a ser trocadas |
| 6 | Simulado de 90 vinha com 89 | relato do dono | folga de 10% na 1ª rodada (90 de 90 em todos os simulados da bateria) |
| 7 | **Bloco preso** quando o limite de IA do dia acabou | "Iniciar" → 429; "Continuar" → 409 por 2 min | o bloco volta a "pendente" se a geração falha; limite gasto abre a atividade sem IA (provas anteriores/revisão) |
| 8 | **Custo de IA sem aluno** (o mais grave) | desde 09/10, 579 de 581 chamadas sem aluno; tetos de custo por aluno nunca disparavam; modelo por plano não valia | contexto ligado no `withFeature` e nas 4 rotas que consomem direto (`bindAiCallContext`); medido no servidor: chamadas novas saem com aluno e plano |
| 9 | Rótulo "Etapa 3 de 3" com a etapa 2 pendente | roteiro no celular | mostra a primeira etapa pendente |
| 10 | Topo do celular estourava com ofensiva e nível | sino e avatar fora da tela em 375 px | símbolo do logo no lugar do nome; nada sai da tela |

## Funcionou como esperado

- Limites: 21º quiz recusado (429); simulado acima de 90 questões no dia recusado (429); fechar o dia duas vezes (409); resumo curto (400); anotação vazia (400).
- Responder: correção certa/errada do servidor batendo em 100% das respostas de quiz; responder de novo recusado (409); nota final igual à esperada.
- Provas anteriores: 90/90/180 questões com cronômetro (5h30, 5h, 10h30). As respostas não mostram certo/errado durante a prova (correto: só no fim).
- Bloco do plano (concurso e ETEC): iniciar → continuar abre a mesma atividade → check manual → anotação → atividade terminada → "concluído" → iniciar de novo recusado (409).
- Flashcards: deck de 30 com 30 cartões; revisão grava a data; flashcards do quiz ligados à questão de origem (6 de 9 por erro, 3 de conceito).
- Fechar o dia: a IA achou os erros plantados de propósito (Mendel 1:1, "Plutão é o nono planeta", concordância) e virou flashcards.
- 52 aberturas de página com a sessão do aluno, todas 200, sem erro de tela.

## Riscos que continuam

- **Cota do Gemini:** com várias rotinas ao mesmo tempo, a chave respondeu "IA ocupada" (503) e um quiz saiu com 18 de 20. É o plano grátis do Google; com vários alunos, isso vai acontecer em produção. Ativar o faturamento é obrigatório.
- **Tempo de geração:** quiz de 20 em 15 s (mediana), até 46 s; simulado de 90 em 50 a 57 s.
- Custo desta bateria: cerca de US$ 1,40 no total (geração + duas conferências por IA).
