# Fontes e licenças das questões do banco

Atualizado em 09/10/2026. Regra do projeto: **só entra no banco o que tem fonte e licença registradas aqui**. Fonte com licença incerta não é importada.

## Fontes avaliadas

| Fonte | URL | Licença / termos | Anos e quantidade | Situação |
|---|---|---|---|---|
| **INEP** — provas e gabaritos do ENEM (fonte primária) | https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos | Rodapé do site: "Todo o conteúdo deste site está publicado sob a licença **Creative Commons Atribuição-SemDerivações 3.0 Não Adaptada**" (texto lido na página em 09/10/2026). | Edições de 1998 a 2025 listadas na página, em PDF | **Origem** de todas as questões importadas; ver observações |
| **enem.dev** (API pública, `https://api.enem.dev/v1`; código em https://github.com/yunger7/enem-api) | https://docs.enem.dev | Documentação: "Todos os dados são públicos e podem ser utilizados sem a necessidade de atribuição de créditos, respeitando a licença GNU GPL-2.0". O projeto afirma que os dados vêm dos PDFs do INEP, transformados em JSON. | 2009 a 2023, cerca de 2.700 questões (ex.: 2022 → 183 e 2023 → 181 na API) | **Usada como transcrição de conveniência** das provas do INEP (piloto) |
| SAT / College Board | — | Questões do SAT são protegidas por direito autoral; não há licença aberta. | — | **Não importado** |
| Outros vestibulares e concursos | — | Não avaliados | — | **Não importado** |
| Outros conjuntos abertos de questões do ENEM (ex.: bases públicas em plataformas de dados) | — | Não avaliados a fundo | — | **Não importado** |

## O que a licença do INEP permite e o que isso exige de nós

A CC BY-ND 3.0 permite copiar e redistribuir o conteúdo, inclusive comercialmente, **desde que**: (1) se atribua o crédito ao INEP; (2) o conteúdo **não seja modificado** (sem derivações).

O que o app faz para respeitar isso:

- **Atribuição:** toda questão mostra a prova, o ano e o número ("ENEM 2022, Questão 45") e grava `source_name = INEP`, `source_url` e `license`.
- **Sem modificação:** o enunciado, o texto de apoio e as alternativas entram exatamente como vieram da fonte (`src/lib/bank/import.ts`, coberto por teste). O que o app acrescenta (matéria, assunto, dificuldade estimada, resolução comentada) é conteúdo **separado** e identificado como tal.
- **Questão incompleta não entra:** sem gabarito (anulada), com alternativa faltando ou com imagem quebrada na fonte, a questão é recusada na importação.

## Ressalvas e riscos (leia antes de escalar a importação)

1. **Conteúdo de terceiros dentro das provas.** Textos de apoio e imagens das provas são, muitas vezes, trechos de obras e fotografias de terceiros. A licença do site do INEP cobre o conteúdo que o INEP publica, mas não resolve, por si só, os direitos dessas obras. Na prática, é o uso que cursinhos e plataformas de estudo fazem das provas, com finalidade educacional e citando a fonte; ainda assim **vale uma confirmação jurídica antes de importar o acervo inteiro**.
2. **A licença do enem.dev (GPL-2.0) não substitui a do INEP.** O enem.dev apenas transcreveu as provas do INEP; a base legal do uso é a do INEP (CC BY-ND). A GPL-2.0 sobre dados é incomum, e o app usa os dados como serviço (não distribui código). Mesmo assim, o certo é, antes de escalar, **buscar os PDFs direto no INEP** (o importador foi escrito para trocar de fonte sem mexer no resto).
3. **Imagens.** As imagens ficam hospedadas no enem.dev e o app só aponta para elas. Se o enem.dev sair do ar, as imagens quebram. Antes de escalar, copiar as imagens para o armazenamento próprio.
4. **A fonte marca imagens que não conseguiu extrair** com uma figura "This image is broken" (`https://enem.dev/broken-image.svg`) respondendo status 200. Um teste só de "a imagem abre" não percebe isso. O importador recusa essas questões, e o script `scripts/bank/purge-broken.ts` limpa as que já tinham entrado.

## Lote piloto (importado em 09/10/2026)

Importado com `scripts/bank/import-enem.ts --years 2022,2023 --sample 100 --batch piloto-2026-10`: 100 questões escolhidas por sorteio com semente fixa, igual número por área.

| Etapa | Resultado |
|---|---|
| Questões sorteadas | 100, de 2022 e 2023, com o mesmo número por área (a fonte tinha 183 e 181 questões nessas edições) |
| Recusadas na leitura das duas edições | 3: duas com alternativas incompletas e uma com alternativa vazia |
| Imagem quebrada na fonte | 1 questão (2023, nº 44) detectada depois e removida com `purge-broken.ts` |
| Importadas | 98 na primeira execução (2 das 100 sorteadas já constavam como repetidas na fonte); com a remoção da questão de imagem quebrada, ficaram **97** (2022: 51, 2023: 46), todas inicialmente **não publicadas** |
| Resolução da IA = gabarito oficial → **publicadas** | **24** (2022: 6; 2023: 18) |
| Resolução da IA ≠ gabarito oficial → **não publicadas, para revisão** | **2** (2022 Q23 e 2023 Q29) |
| Ainda sem classificar (ocultas) | **71** |

Por que 71 ficaram sem classificar: a chave do Gemini usada nos testes está no plano grátis do Google e **bateu a cota** (erro 429, "You exceeded your current quota") depois de cerca de 27 questões. Não é um problema do código: ao ativar o faturamento da chave, basta rodar de novo (o script só pega as pendentes):

```bash
npx tsx --env-file=.env.local scripts/bank/classify.ts --batch piloto-2026-10 --concurrency 3
```

Custo medido nas 27 questões classificadas: US$ 0,128 no total, cerca de **R$ 0,026 por questão** (≈ US$ 0,0048). Classificar as ~2.700 questões do enem.dev custaria na ordem de R$ 70.

As 24 publicadas hoje são de Linguagens (16: Língua Portuguesa 10, Literatura 4, Espanhol 2) e Ciências Humanas (8: Geografia 6, História 1, Sociologia 1). Matemática e Ciências da Natureza só aparecem depois de classificar o restante.

## Acervo dos simulados (09/10/2026)

As provas do ENEM de **2019 a 2023** foram importadas inteiras (`import-enem.ts --all --publish`, lote `enem-2019-2023`), incluindo as 5 questões de Inglês e as 5 de Espanhol de cada edição. Hoje há **902 questões publicadas** (cerca de 200 ou mais por área). Ficaram de fora 11 questões que a fonte trazia incompletas ou com imagem quebrada, e as 2 em que a resolução da IA divergiu do gabarito.

Essas questões são publicadas com o **gabarito oficial** e **sem resolução comentada**. A resolução só aparece depois que `classify.ts` roda e a resposta da IA bate com o gabarito (as 24 do piloto já têm). Para o aluno, as questões aparecem dentro de **Simulados → Estude com provas anteriores do ENEM** (1º dia, 2º dia ou prova completa, 90/180 questões misturando as edições), só para quem escolheu o ENEM na personalização. Não existe mais a tela "Banco de questões" com filtros.

**Concursos:** não existe API gratuita e licenciada de questões de concurso (os grandes acervos, como QConcursos e TEC Concursos, são pagos e protegidos). Por isso o simulado do concurso é **gerado por IA** no estilo da banca, sempre com o selo "Gerado por IA", um por dia nos planos pagos.

## Como validamos a resolução comentada

- A IA recebe a questão **sem o gabarito** (e, quando há, as imagens), resolve, escreve a resolução e classifica (matéria, assunto, subassunto, habilidade, dificuldade estimada).
- O **gabarito oficial é a verdade**: a questão só é publicada se a resposta da IA bater com ele. Se divergir, fica `explanation_status = divergente`, não publicada, com o aviso `[REVISAR]` no texto, para um professor conferir.
- `review_status` começa em `nao_revisada`. A tela interna `/dashboard/interno/questoes` lista as divergentes, os reports dos alunos e uma amostra de questões para o professor marcar como `amostra_revisada` ou `revisada` (também há exportação em CSV).
- A dificuldade é **estimada pela IA**; não é calibração oficial (a TRI do INEP não é pública para todas as edições).

## Como importar e classificar mais questões

```bash
# 1) importar (sem --publish não publica nada; com --publish publica com o gabarito oficial, sem resolução)
npx tsx --env-file=.env.local scripts/bank/import-enem.ts --years 2022 --all --batch ano-2022
# 2) classificar e validar contra o gabarito (gasta IA; custo no fim do relatório)
npx tsx --env-file=.env.local scripts/bank/classify.ts --batch ano-2022
# 3) limpar questões com imagem quebrada na fonte (se sobrar alguma)
npx tsx --env-file=.env.local scripts/bank/purge-broken.ts
```

Os scripts podem rodar de novo sem duplicar nada. Conforme combinado, mostre o resultado e o custo do piloto a quem decide antes de rodar o acervo inteiro.
