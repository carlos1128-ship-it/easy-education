# Prompt: próxima fase do produto Easy Education

> Cole este prompt no Claude que trabalha no repositório `easy-education`. Anexe também `relatorio-concorrente-simplestudy.md` e `mascote-estilo-e-adaptacao.md`, que trazem o contexto.

---

## Papel e regras de trabalho

Você é o engenheiro e o parceiro de produto da Easy Education (Next.js 16, Supabase, Prisma, Gemini, Vercel). Antes de propor qualquer coisa, leia `README.md`, `docs/produto-easy-education.md`, `docs/consumo-ia.md`, `docs/plano-melhorias.md`, `docs/fontes-questoes.md` e `src/lib/plans.ts`.

**Escopo desta fase: só produto.** Ficam fora agora: preços, planos comerciais, Stripe, login com Google, e-mail de contato e suporte, e páginas legais. Não proponha mudanças nesses pontos.

1. **Não escreva código na primeira resposta.** Entregue um **plano**: para cada item, os arquivos que mudam, as migrations, o esforço em dias, os riscos e o impacto no custo de IA. Espere eu aprovar.
2. **Seja crítico.** Se um pedido for ruim, caro ou conflitar com outro, diga e proponha uma alternativa. Se não tiver certeza (API, formato de prova, custo), verifique na documentação oficial ou diga que não sabe.
3. Todo recurso novo que use IA entra em `src/lib/plans.ts` (`FeatureKey`, peso e limites; use os limites atuais como referência, sem mexer em preço), passa por `consumeFeature` no servidor e grava em `ai_call_logs`. Atualize `docs/consumo-ia.md` com o custo estimado de cada recurso.
4. Textos em português do Brasil, no tom da marca: próximo, direto, frases curtas. Nada de "ilimitado" se existir teto.
5. Teste com Vitest as regras puras. Ao final de cada item, atualize `docs/produto-easy-education.md`.

---

## Parte 1: pedidos do dono

### 1.1 Bloco de estudos: iniciar uma vez e fechar após a conclusão

Cada bloco do plano só pode ser iniciado uma vez por dia. Depois de concluído, ele fecha: fica marcado como feito, sem o botão "Iniciar".

**Critério de aceite:**
- O estado fica persistido no servidor: `pendente → em andamento → concluído`.
- Se o aluno sair no meio, o bloco mostra **"Continuar"** e reabre a mesma atividade (a lógica de reaproveitamento em `src/lib/study-start.ts` já existe), sem gerar IA de novo.
- Bloco concluído não gera nada. A API recusa com 409 uma nova tentativa de iniciar.

**Observação:** defina "concluído" com precisão. Proponho: atividade do bloco terminada (quiz ou simulado respondido até o fim, deck revisado, redação enviada) **ou** minutos planejados cumpridos. A trilha e o cronômetro hoje têm regras parecidas; unifique numa função só.

### 1.2 Teste de confiabilidade: mínimo de 90% de acerto nas questões geradas pela IA

Medir, com número, se as questões da IA estão certas. Abaixo de 90% não é aceitável.

**Critério de aceite:**
- Um script reproduzível em `scripts/eval/` que gera um relatório com **% de questões corretas por área ou matéria, tamanho da amostra e intervalo de confiança**.
- Duas medições:
  1. **Confiabilidade do verificador:** rode o resolvedor às cegas de `src/lib/question-quality.ts` sobre as **902 questões oficiais do ENEM** já importadas e compare com o gabarito oficial.
  2. **Correção das questões geradas:** gere uma amostra (por exemplo, 30 por área) e faça uma revisão humana em `/dashboard/interno/questoes`. Uma questão só conta como correta se tiver o gabarito certo, uma única alternativa defensável e explicação sem erro factual.
- **Portão automático:** matéria abaixo de 90% passa a usar o banco oficial ou um modelo mais forte até ser reavaliada.
- O resultado vai para `docs/confiabilidade-ia.md`, com data, modelo e amostra.

**Observações:**
- 90% é piso. Significa 1 questão errada a cada quiz de 10. A meta deveria ser 95% ou mais.
- O verificador usa a mesma família de modelo que gera as questões, então os erros tendem a coincidir. Teste a verificação com outro modelo (o `gemini-2.5-flash` conferindo o `flash-lite`, por exemplo) e mostre a diferença.
- Sem revisão humana, o número fica sem base. Se não houver revisor, diga isso no relatório.

### 1.3 Plano de estudos: "hoje" sempre primeiro

A semana começa no dia de hoje. Exemplo: **sexta (hoje), sábado, domingo, segunda...** até quinta.

**Critério de aceite:**
- A ordem é calculada no fuso de Brasília (`todayWeekday` em `src/lib/study-plan.ts`), com "hoje" destacado.
- Vale em todas as telas que listam a semana.
- Há teste para a virada de meia-noite.

### 1.4 Roteiro do plano fixo na tela, com checks automáticos

O roteiro do dia (os passos do bloco, que já existem em `src/lib/study-roadmap.ts`) fica **fixo na tela** enquanto o aluno estuda. Cada passo ganha o check sozinho quando é cumprido.

**Critério de aceite:**
- No desktop, painel lateral fixo. No celular, barra recolhível que não cobre o conteúdo.
- O check vem de eventos reais (quiz terminado, flashcards revisados, tempo cumprido), não de clique manual.
- O estado sobrevive a recarregar a página.

### 1.5 Flashcards automáticos depois de um simulado ou quiz

Ao terminar um quiz ou simulado, aparece a opção **"Criar flashcards para revisar"** desse assunto.

**Critério de aceite:**
- Os cartões priorizam **as questões erradas**, e depois os conceitos do assunto.
- O `Flashcard` passa a apontar para a questão de origem (a falta disso já foi apontada em `docs/plano-melhorias.md`).
- Consome o limite `ai_flashcards`. Se já houver deck recente do assunto, oferece adicionar a ele.
- É opcional: só gera se o aluno pedir.

### 1.6 Anotações e observações do aluno

**Critério de aceite:**
- Novo modelo `Note`: dono, texto, data e, opcionalmente, ligação com matéria, tópico, bloco, quiz, questão ou arquivo. Com RLS.
- Dá para anotar dentro da questão, do bloco e do arquivo. Existe uma tela "Minhas anotações" com filtro por matéria.
- As anotações entram na busca global. Não gasta IA.
- *Para depois (só planejar):* "transformar minhas anotações em quiz ou flashcards", que reforça o diferencial de usar o material do próprio aluno.

### 1.7 Fechar o dia de estudos com um resumo corrigido pela IA

Para fechar o dia, o aluno escreve um **resumo do que estudou**, com **mínimo de 200 e máximo de 5.000 caracteres**. A IA corrige e devolve uma **explicação**: o que está certo, o que está errado ou incompleto e o que revisar.

**Critério de aceite:**
- Contador de caracteres. O limite é validado no cliente e no servidor (Zod).
- A IA recebe o resumo **e o que o aluno de fato fez no dia** (blocos, assuntos e erros). Ela não pode inventar conteúdo que o aluno não estudou.
- A correção fica guardada no histórico do dia.
- Novo `FeatureKey` (por exemplo `day_summary`), com limites propostos e custo medido.
- Um conceito errado no resumo pode virar flashcard (item 1.5).

**Observação:** não torne obrigatório para manter a ofensiva. Exigir texto todo dia faz o aluno abandonar. Proponho: opcional, com recompensa na trilha.

### 1.8 ETEC no onboarding

Adicionar o **Vestibulinho das ETECs** (Centro Paula Souza, SP) como objetivo no onboarding.

**Formato apurado em matéria de imprensa** (reconfira no manual oficial do candidato):
- **50 questões objetivas** (30 na prova de vagas remanescentes), **5 alternativas (A a E)**, 4 horas.
- Conteúdo do Ensino Fundamental II: Português, Matemática, Geografia e História, Ciências.
- Questões **interdisciplinares**, com interpretação de texto e de gráfico. A matéria não menciona redação.

**Critério de aceite:**
- Nova opção em `src/lib/learner-profile.ts` e estilo de prova em `src/lib/exam-style.ts` (nível de 9º ano, interdisciplinar, contextualizado).
- Simulado no formato da prova.

**Dependência:** as alternativas estão fixas em **A a D** (`LETTERS` em `quiz-questions.ts`, o esquema enviado à IA, o validador e o `QuizRunner`). A ETEC **e o próprio ENEM** usam **A a E**. Resolva isso antes ou junto.

### 1.9 Resumo falado (áudio)

**Esclareça comigo antes de implementar.** O pedido tem duas leituras:
- **(A)** A IA gera um **resumo em áudio** de um material, tópico ou dia de estudo, para o aluno ouvir.
- **(B)** O aluno **grava o resumo do dia falando** (item 1.7), e a IA transcreve e corrige.

Para (A), compare:
1. **Web Speech API do navegador:** custo zero, mas a voz em pt-BR varia de aparelho para aparelho.
2. **Gemini TTS:** pela página oficial de preços, em out/2026, o Flash-Lite TTS custa US$ 6 por 1M de tokens de áudio (25 tokens por segundo), e **o preço dobra em 1/1/2027**. Isso dá cerca de US$ 0,03 por 3 minutos. Reconfira.

Em qualquer caso: **gere uma vez e guarde no Storage** para reaproveitar, crie o `FeatureKey` e mostre a transcrição junto.

---

## Parte 2: o que aprender com o concorrente (SimpleStudy)

### Como eles conseguem cobrar barato

Pela API pública deles, a IA trabalha quase toda **nos bastidores, como fábrica de conteúdo**:
- Resumos, respostas-modelo, diagramas e simulados (inclusive no formato do ENEM) são gerados **em lote, uma vez**, e depois servidos a centenas de milhares de alunos.
- Os jobs rodam em **fila em segundo plano**, fora da requisição do aluno.
- O conteúdo sai de planilhas e do Notion, com filtros por matéria, unidade, tópico e subtópico.
- A IA ao vivo, por aluno, se resume a um chat de dúvida e à correção, que fica só no plano mais caro.
- Eles medem `total_cost` por conversa.
- No front-end, tudo o que é pesado (a animação do mascote) só carrega quando aparece na tela.

**O resultado:** o custo de IA vira **custo fixo diluído**, e o custo por aluno fica perto de zero. Na Easy, hoje, quase toda ação do aluno gasta IA.

**Avalie e proponha como a Easy pode fazer o mesmo sem perder o diferencial** (gerar a partir do material do aluno):

1. **Biblioteca pré-gerada por tópico.** Um catálogo de tópicos do ENEM, da ETEC e das matérias escolares, cada um com quiz e flashcards gerados uma vez, aprovados pelo teste do item 1.2 e servidos a todos. O `SharedQuestion` já aponta nessa direção.
   - Regra proposta: **primeiro procura no acervo; só gera com IA o que faltar** (ou o que vier do material do próprio aluno).
   - Meça quanto isso reduz o custo por aluno.
2. **Geração em lote e em segundo plano.** Mover a produção do acervo e os simulados longos para jobs fora da requisição (hoje há prazo de 19 s), no modelo mais barato e em modo batch quando a API oferecer. Proponha a infraestrutura mais simples que funcione na Vercel e no Supabase.
3. **Cache agressivo.** Mesmo tópico + mesmo nível + mesmo estilo de prova = reaproveitar. Isso vale para quiz, flashcards, resumo em áudio (1.9) e resolução comentada das provas oficiais (que já é feita uma vez).
4. **Resumos curados por tópico.** Eles vendem resumos prontos. A Easy pode ter um resumo por tópico do acervo, gerado uma vez e revisado. Ele serve de base para o áudio (1.9) e para o resumo do dia (1.7).
5. **Simulado no formato oficial.** Eles geram simulados com estrutura de prova real (seções, área do ENEM, pontuação). Ligue isso à mudança para A a E (1.8) e ao simulado cronometrado que a landing já promete.
6. **Montador de prova.** Eles têm um "Exam Builder": o aluno escolhe matérias, tópicos e quantidade. Avalie se o simulado da Easy deve ganhar esse controle, usando o acervo do item 1.
7. **Medição de custo por recurso.** A Easy já registra o custo de cada chamada à IA. Garanta que os recursos novos (1.7, 1.9 e o acervo) apareçam separados em `/dashboard/interno/custos`.

### O que eles não fazem e deve ser reforçado

Gerar treino a partir do material do aluno (PDF, foto, vídeo), chat que age, correção de redação, revisão espaçada e concurso. Os itens acima não podem enfraquecer isso: o acervo pré-gerado barateia o básico, e a IA ao vivo fica para o que é pessoal.

### O que não copiar

- Conteúdo genérico como produto principal.
- Erros que eles cometem:
  - reclamações de conteúdo de História do Brasil errado;
  - anos de prova trocados (aparece uma prova do ENEM de "1938");
  - tradução ruim.

  O teste do item 1.2 existe justamente para a Easy não repetir isso.

---

## Parte 3: mascote (só o plano agora)

Detalhes em `mascote-estilo-e-adaptacao.md`.

- **Hoje:** 8 WebPs animados (32 quadros, 200 px, cerca de 1,75 MB no total). A troca de humor substitui o arquivo inteiro. A coruja não reage e fica borrada em tamanho grande.
- **Como o concorrente faz:** vetor chapado, sem contorno, com uma única sombra, animado em **Rive** em 3 camadas paralelas (corpo, olhos e objetos). Num arquivo de 95 KB, carregado só quando aparece na tela.
- **Proposta para a Easy:**
  - redesenhar a mesma coruja (óculos, moletom com capelo, pés laranja) em vetor chapado, com as cores dos tokens;
  - animar em Rive com 3 camadas e **Data Binding**: `mood` como enum mapeado para `OwlMood`; triggers `acerto`, `erro` e `concluido`; boolean `falando`;
  - olhos que seguem o ponteiro;
  - um único `.riv` com a pose parada como fallback para `prefers-reduced-motion`.
- **Peça agora apenas:**
  - a especificação do componente novo, mantendo a mesma API de `owl-mascot.tsx` (`mood`, `size`, `message`);
  - a ligação dos triggers aos eventos dos itens 1.1 (bloco concluído), 1.4 (passo do roteiro feito), 1.5 e 1.7 (fechamento do dia).
- **Atenção:** coruja é o território do Duolingo, e o concorrente faz piada com isso. As decisões de estilo devem afastar a coruja da Easy do Duo.

---

## O que eu espero na sua resposta

1. **Plano em fases**, na ordem que você recomenda. Sugestão: 1.3, 1.1 e 1.4 → alternativas A a E + 1.8 → 1.2 → Parte 2 (acervo, lote e cache) → 1.5 e 1.6 → 1.7 → 1.9 → Parte 3. Para cada item: arquivos, migrations, esforço, risco e custo de IA por aluno por mês, antes e depois da Parte 2.
2. **As minhas decisões pendentes**, numa lista curta: definição de "concluído" (1.1), quem faz a revisão humana (1.2), o resumo do dia no plano Gratuito (1.7) e a leitura A ou B do áudio (1.9).
3. **Onde você discorda de mim**, com o motivo.
