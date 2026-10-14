# SimpleStudy: análise de funcionalidades (REA, 14/10/2026)

Fonte: sessão logada (conta própria) observada pelo REA via CDP, mais o JavaScript
do cliente exportado. Registro aqui só arquitetura, rotas, nomes de campos e regras.
Não há código nem conteúdo (resumos, questões, cartas) do SimpleStudy.

## Arquitetura

- Front: Next.js (App Router, Turbopack), React Server Components. As telas chegam
  como payload RSC (`text/x-component`); o navegador quase não chama JSON direto.
- Backend separado: `api.simplestudy.com/api` e um serviço de IA em `/ai`.
  Os hooks gerados (`useGamificationControllerGet`, ...) indicam backend NestJS com
  cliente OpenAPI gerado (orval + React Query).
- Observabilidade e analytics: Sentry e Mixpanel. Fórmulas: KaTeX.
- **Não visível:** banco de dados, regras de correção e geração por IA. Isso roda no
  servidor deles e só pode ser inferido pelo comportamento.

## Rotas de tela observadas

| Rota | Função |
|---|---|
| `/account/my-space` | Espaço do aluno (dashboard) |
| `/account/notes/revision/{id}` | Leitura de resumo |
| `/account/quiz/quiz_view/{id}` | Quiz oficial |
| `/account/community/quiz/{id}` | Quiz criado por usuário |
| `/account/questions-by-topic/create-lesson` | Banco de questões / montar sessão |
| `/subscription/plans` | Planos / paywall |

## Modelo de conteúdo

- Hierarquia: **exame → matéria → unidade → tópico → subtópico**
  (`/subject?examId&examBoardId`, `/subject-dashboard/{unit,topic,subtopic}`,
  `/navigation-menu/...`). Cada tipo tem a sua árvore: `/note/hierarchy`,
  `/quiz/hierarchy` e `/flashcard/hierarchy`.
- Resumo dividido em **"bites"** (blocos curtos). Conclusão registrada por bloco
  (`/note/{id}/bites/completion`) e pelo resumo inteiro, com duração
  (`/note/{id}/completion {duration}`).

## Progresso

`POST /user-progress {userId, feature, relatedId, totalItems, isCompleted}`.
Valores de `feature`: `QUIZ`, `NOTE`, `NOTE_DOWNLOAD`, `EXAM_BUILDER_EXAM`.
É uma tabela de eventos genérica que alimenta o "% concluído" e as recomendações
("A seguir: ...").

## Gamificação

- Estado inicial: `hearts: 5`, `diamonds: 18`. Vidas limitadas a 5 (`min(hearts, 5)`).
- Errar no quiz gasta 1 vida. Os horários de gasto ficam guardados
  (`spent-heart-timestamps`), e com eles a vida se regenera com o tempo.
- Sem vidas: modal "Out of Hearts" com 3 saídas. Compartilhar dá +3 vidas, completar
  um baralho de flashcards também recupera, e a terceira é virar Premium.
- XP por atividade (`10 XP` em "Comece a estudar"), **meta diária** (0/20 XP),
  gráfico semanal, sequência (streak, ícone de fogo) e níveis (`/levels`).
- Estado salvo no servidor (`gamification` controller) com cópia em cookie para
  mostrar na hora.

## Banco de questões ("qbt")

- Questão com **partes** (`question_parts`), `total_marks` / `obtained_marks`.
- Quatro formas de responder: marcar nota manual (`manual-answer`), **foto da
  resolução corrigida por IA** (`scan-answer`, `upload-answer`), modo prova
  (`exam-mode-flag`, `upload-exam-mode-images`) e conversão para LaTeX.
- Depois de corrigir: nota, acertos, tempo de estudo, "você foi melhor que X% dos
  alunos", estatísticas da turma por questão e abas Questão/Explicação.
- Montar uma prova sob medida ("exam builder") conta como `EXAM_BUILDER_EXAM`.

## Conteúdo do usuário ("community")

Upload de fontes (`/community/upload-sources`), geração assíncrona por fila
(`/tasks`, `trigger-flashcard-and-quiz-generation`,
`trigger-content-generation-by-note`), além de CRUD de quiz, pergunta, baralho e carta.

## Comparação com o Easy Education

| SimpleStudy | Easy Education hoje | Falta |
|---|---|---|
| Quizzes | `Quiz`, `QuizQuestion` | vidas/XP ligados ao quiz |
| Flashcards | `FlashcardDeck`, `Flashcard` | recuperar vida ao completar baralho |
| Banco de questões | `BankSubject/Topic/Question/Session/Answer` | questão em partes com nota; correção por foto |
| Provas anteriores | `PastExam`, `ExamAttempt` | — (já existe) |
| Resumos | `Note` | divisão em blocos + conclusão por bloco |
| Hierarquia unidade→tópico→subtópico | `BankTopic` | níveis unidade/subtópico |
| Vidas, diamantes, XP, meta diária, streak, níveis | — | **tudo** |
| Progresso genérico por feature | `UsageEvent`, `StudySession` | tabela de progresso + recomendações |
| Geração por IA a partir de upload | `UploadedFile` + IA | fila de tarefas visível |
