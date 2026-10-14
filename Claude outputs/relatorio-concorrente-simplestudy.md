# Relatório de concorrente: SimpleStudy (simplestudy.com) vs. Easy Education

Pesquisa feita em 10/10/2026. Fontes: site público (incluindo a versão /pt-br), inspeção técnica do front-end no navegador (o equivalente ao F12), lojas de apps, Trustpilot, imprensa irlandesa e britânica, vagas no Wellfound, perfis no TikTok e Instagram e a Biblioteca de Anúncios da Meta. Do lado da Easy, li o repositório local apenas para leitura.

**Legenda de confiança:** ✅ confirmado (visto direto na fonte) · 🟡 declarado pela empresa, sem verificação independente · 🔶 inferência minha, pode estar errada.

> **Para o Claude que vai analisar este relatório:** o objetivo é decidir o que a Easy Education deve copiar, ignorar ou atacar. Seja crítico. O dono quer a verdade, não validação. O contexto da Easy está na seção 9.

---

## 1. Resumo executivo (leia isto primeiro)

1. **É concorrente direto no Brasil, e já está aqui.** O SimpleStudy é irlandês, mas tem site em português, foco declarado no ENEM e em 12 vestibulares, preços em reais, um time de marketing com brasileiros e programa de embaixadores no Brasil. ✅
2. **O produto é outra categoria.** O SimpleStudy é uma **biblioteca de conteúdo pronto**: resumos, provas anteriores, redações-modelo, quizzes e flashcards por tópico. A IA dele trabalha **nos bastidores, como fábrica de conteúdo**. A Easy é **IA gerativa sobre o material do próprio aluno**. Eles vendem "tudo pronto e curado"; a Easy vende "o seu material vira treino". ✅ (o texto da vitrine) / 🔶 (a conclusão sobre o uso da IA, tirada da API exposta; ver seção 5)
3. **A vantagem real deles é distribuição, não tecnologia.** Eles têm SEO programático em escala, app nativo com mais de 500 mil downloads, venda para escolas, compra pelos pais, embaixadores pagos por venda e captação de investimento. A Easy ainda não lançou: o Stripe está em modo de teste e não há Pix, Termos de Uso, Política de Privacidade, e-mail ou push.
4. **O custo de IA deles por aluno tende a ser muito menor que o da Easy.** O conteúdo é gerado uma vez e servido a centenas de milhares de alunos. Na Easy, cada quiz, flashcard e correção gasta IA por aluno. Isso muda o que dá para oferecer no plano grátis e no preço. 🔶
5. **Os preços no Brasil ficam abaixo dos da Easy quando a assinatura é anual.** O plano intermediário (Advanced) custa R$ 12,49 por mês no anual, contra R$ 19,90 do Básico da Easy, que só existe no mensal. No mensal os valores se parecem. ✅
6. **Os pontos fracos deles são reais e exploráveis.** A localização é mal feita (título "USD$", App Store irlandesa, telefone da Irlanda, erros de ano nas provas, reclamação de conteúdo de História do Brasil errado). Os números de marketing são inflados e se contradizem. Há um "50% OFF" permanente. Há reclamações de cobrança no Trustpilot. E o conteúdo é genérico, não vem do material do aluno.

---

## 2. Quem são

| Item | Dado | Conf. |
|---|---|---|
| Empresa | SimpleStudy Limited, Irlanda (Rosscarbery, Co. Cork). CRO 666184 | ✅ |
| Fundadores | Oisín Devoy (CEO, economia na Sciences Po) e Phillip McKenna (ex-head de growth da Bitaccess). Zac Dair foi citado em 2023 como cofundador técnico (doutorado em IA) e não aparece mais na página "Sobre" | ✅ |
| Fundação | 2020 ou 2022, conforme a fonte | ✅ (inconsistente) |
| Time | 25 pessoas na página "Sobre". Escritório em Lisboa, trabalho remoto. Inclui Head of Content e marketing com nomes brasileiros ou portugueses (Sophie Soares Bom Jesus, Bruno Gomes, Henrique Sankievicz Lima) | ✅ |
| Países | Irlanda, Reino Unido, Brasil, África do Sul, Austrália e Nova Zelândia | ✅ |
| Usuários | Os números se contradizem: "500 mil+" no site, "1M+" no header, "1,5M+" e "40 a 50 mil novos por semana" nas vagas, "350 mil" na página de preços | 🟡 |
| Brasil | "Mais de 100.000 alunos atendidos em escolas de todo o Brasil" (página de escolas) | 🟡 |
| Irlanda | "1 em cada 4 estudantes do ensino médio usa" | 🟡 |

### Investimento

- **Pré-seed de €750 mil em 2024**, com Des Traynor e Ciaran Lee, cofundadores da Intercom. Também passaram pela aceleradora NDRC e pela Charlotte Street Capital. ✅ (imprensa)
- Em set/2024 buscavam uma rodada de US$ 5 a 6 milhões. ✅ (imprensa)
- O Wellfound mostra "US$ 1,7M em 2 rodadas", com um seed de US$ 1M em jan/2025. O texto das vagas fala em "seed de ~US$ 4M recém-fechado", com investidores ligados a Strava, OpenAI, Meta, Facebook e Revolut. **Os números não batem.** 🟡
- **Receita nunca foi divulgada.** A única pista: em 2023 a meta era chegar a **€50 mil de MRR no 1º trimestre de 2024**. Não se sabe se bateram. 🟡

---

## 3. Como ganham dinheiro

### 3.1 Assinatura B2C, com três níveis e cobrança mensal ou anual

Preços do Brasil, extraídos do código da página `/pt-br/pricing`: ✅

| Plano | Mensal | Anual (equivalente por mês) | "Preço cheio" riscado |
|---|---|---|---|
| Basic | R$ 12,90 | R$ 4,92 (≈ R$ 59/ano) | R$ 24,99 / R$ 10,00 |
| **Advanced** (padrão, "mais popular") | **R$ 29,90** | **R$ 12,49** (≈ R$ 150/ano) | R$ 60,00 / R$ 25,00 |
| Ultimate | R$ 49,90 | R$ 20,75 (≈ R$ 249/ano) | R$ 99,99 / R$ 41,67 |

O que cada plano inclui (pela página global; a do Brasil não detalha):

- **Basic:** resumos premium, respostas e redações-modelo, provas anteriores com gabarito, questões por tópico, simulado e prova personalizada.
- **Advanced:** tudo do Basic, mais todos os quizzes e flashcards por tópico, resumos para imprimir e provas de listening.
- **Ultimate:** tudo do Advanced, mais **"Essay & Exam Grading"** (correção de redação e prova), **"Exam Predictions"** (previsões de prova) e questões ilimitadas.

**Táticas de preço:**

- **Desconto permanente de 50%** sobre um "preço cheio" riscado. Isso é ancoragem. Não sou advogado, mas no Brasil isso pode ser questionado pelo CDC ou pelo Procon se o preço cheio nunca foi praticado. 🔶
- **Garantia de 14 dias.** A da Easy é de 7.
- O plano destacado por padrão é o do meio.
- Na Play Store aparecem **5 dias de Premium grátis**. ✅

### 3.2 Pais como pagadores ✅

A página de preços abre com **"Peça ajuda aos seus pais"** e um botão para compartilhar o link com eles (WhatsApp, Facebook e Gmail). Há também uma página só para pais, onde eles cadastram o próprio e-mail e o do filho e pagam.

### 3.3 B2B para escolas ✅

- Licença para a escola inteira, com o plano **Ultimate para todos os alunos**. O preço sai sob consulta, conforme o número de alunos.
- O teste grátis depois da demonstração dá contas a todos os professores e a 30 alunos.
- Para o professor: **painel da turma** e **Exam Builder**, que monta uma prova imprimível em segundos a partir de matéria, tópicos e número de questões.
- Há um Head of School Sales e vendedores por país. Uma das vagas abertas é de "GTM Lead B2B".
- 🔶 O código público do front-end tem um e-mail fixo: **`colegioolimpo@gmail.com`**. O Colégio Olimpo é uma rede de escolas brasileira, então é provável que seja um cliente B2B no Brasil com tratamento especial no cadastro. É inferência; não confirmei.

### 3.4 Outras fontes

- Compras dentro do app iOS (10 itens, de US$ 3,99 a US$ 79,99). ✅
- "Mentoria" e "Tutoring" aparecem no rodapé, sem descrição. 🟡

---

## 4. Funcionalidades: inventário completo

### Conteúdo (o coração do produto)

- **Resumos** por tópico, apresentados como "revisados por especialistas". Na prática, a API mostra que são gerados e estilizados por IA (ver seção 5). ✅
- **Provas anteriores com gabarito** em PDF. ENEM desde 2009, por matéria, com download direto da CDN deles. ✅
- **12 vestibulares:** FUVEST, UNICAMP, UNESP, UERJ, UFPR, UFRGS, UnB, ITA, IME, UEA, UECE e UEMA. ✅
- **Redações-modelo** de alunos com nota alta. ✅
- **Quizzes por tópico**: Biologia do ENEM tem mais de 92 tópicos. **Flashcards** por tópico. ✅
- **Simulados** e **Exam Builder**, para gerar uma prova personalizada. ✅
- Cronograma ou edital do ENEM 2025 e 2026. Calculadora de nota do SISU. ✅

### Engajamento

- Ofensiva, gamificação, metas e matérias mais difíceis no onboarding, acompanhamento de progresso. ✅
- No app: agenda de lição de casa, fórum de estudo, calculadora de nota, provas em áudio. ✅ (Play Store)
- Mascote: um elefante chamado "Stud", com animações feitas em Rive. ✅

### IA voltada ao aluno (o que a API revela; ver seção 5)

- **Chat geral**, **chat sobre uma questão do banco** (recebe a imagem da questão e a do gabarito) e **chat sobre um resumo**. ✅ (os endpoints existem) / 🔶 (não vi a interface por dentro)
- **Correção de redação e prova**, só no Ultimate. 🟡

### Canais

- **Web e app nativo**: iOS nota 4,8 com 68 avaliações; Android com 500 mil+ downloads, nota 4,8 e cerca de 9 a 10 mil avaliações, versão 2.0.62, atualizado em ago/2026. ✅
- Login com Google e **com TikTok**. ✅

---

## 5. Análise técnica (F12)

Tudo abaixo é informação servida publicamente a qualquer visitante. Não criei conta, não fiz login e não chamei nenhum endpoint de escrita.

### Stack

| Camada | Tecnologia | Como identifiquei |
|---|---|---|
| Site de marketing e SEO | **Astro 7.1.6** | Meta generator ✅ |
| Blog / "Student Hub" (SEO) | **Next.js + Payload CMS** atrás de **Caddy** | Header `x-powered-by: Next.js, Payload` e `via: Caddy` ✅ |
| API principal | `api.simplestudy.com/api`, muito provavelmente **NestJS** (Node) | Formato do erro 404 `{"message":"Cannot GET ...","statusCode":404}` 🔶 (assinatura típica do NestJS) |
| Serviço de IA | `api.simplestudy.com/ai`, **Python FastAPI** | Swagger do FastAPI público em `/ai/docs` ✅ |
| Fila de jobs de IA | Os status `queued/started/finished/failed/deferred/scheduled/stopped/canceled` coincidem com os do **Python RQ (Redis Queue)**, o que indica **Redis** | 🔶 |
| Arquivos / CDN | **AWS S3 + CloudFront** (`cdn.simplestudy.io`), servido do ponto de São Paulo (GRU) | Headers ✅ |
| CRM e e-mail de ciclo de vida | **Customer.io** (região UE) | Script ✅ |
| Analytics e anúncios | Google Analytics 4, **Meta Pixel**, **TikTok Pixel**, Partytown | Scripts ✅ |
| Atribuição | Cookies próprios: `seo_landing_page_category`, `acquisition_attribution` etc. Eles medem qual página de SEO gera cada cadastro | ✅ |
| Banco de dados | **Não dá para ver de fora.** NestJS costuma usar PostgreSQL, e o Payload usa MongoDB ou Postgres | ❓ sem certeza |

### O que a API de IA revela (40 endpoints, todos públicos no `/ai/openapi.json`)

Este é o achado mais importante da parte técnica. Os endpoints mostram **onde eles gastam IA**:

**Fábrica de conteúdo** (a maior parte, ferramentas internas):
- `notes/bulk-generate`, `bulk-generate-v2`, `notes/style`, `notes/modify`: geram e estilizam resumos em lote a partir de **planilha Excel ou Google Sheets** (`sheet_url`, `excel_file_url`) e de **páginas do Notion** (`notion_url`). Recebem filtros de matéria, unidade, tópico e subtópico, e um `styler_system_prompt`.
- `sample-answers/generate`, `generate-bulk`: geram respostas-modelo para as questões do banco, inclusive a partir da imagem recortada da questão e do gabarito.
- `diagrams/generate`, `restyle`, `restyle-subject`, `images/generate`: geram e padronizam os diagramas e imagens dos resumos, com `image_model` configurável.
- `mock-exams/generate` mais um **editor completo de simulados** (`ai-edit`, `qa`, `recompile`, `visuals/regenerate`): geram provas no formato oficial. O esquema `Paper` tem o campo **`enem_area`**, então **eles geram simulados no formato do ENEM com IA**.
- `chat/seo`: IA para produzir conteúdo de SEO.

**Voltado ao aluno** (poucos endpoints):
- `chat`, `chat-json`, `chat/qbt` (tutor sobre uma questão), `chat/notes` (tutor sobre um resumo).
- A resposta do chat traz um campo **`total_cost`**: eles medem o custo por conversa, como a Easy faz em `ai_call_logs`.

🔶 **O que concluo daqui:** a IA deles é sobretudo **custo fixo de produção de conteúdo**, diluído entre todos os alunos. O uso por aluno se resume a chat e correção, e a correção fica no plano mais caro. Isso explica como o plano grátis consegue ser generoso em conteúdo.

### Quanto gastam com IA

**Não há número público.** Ninguém divulgou, e eu não tenho como medir. Uma ordem de grandeza, rotulada como chute educado: gerar alguns milhares de resumos, respostas-modelo e diagramas com modelos atuais custa na faixa de **centenas a poucos milhares de dólares por país e matéria**, uma única vez. O custo recorrente vem do chat e da correção, e esses dependem de quantos alunos pagam o Ultimate. Não use isso como dado.

### Observações de segurança e qualidade (servem de lição para a Easy)

- A **documentação Swagger do serviço de IA está pública** em produção. Não testei se os endpoints exigem autenticação, e o esquema não declara nenhuma. Lição para a Easy: desligar docs ou rotas internas em produção.
- O front-end expõe no bundle um e-mail de cliente e um hash fixo.
- O dado das provas tem erros visíveis: aparece uma prova do ENEM de "1938" e outra de "1965" (o ENEM começou em 1998), e "2022" agrupa provas de 2022 a 2024.

---

## 6. Marketing e vídeos

### SEO programático (o principal canal) ✅

Cada combinação **exame × matéria × tipo de conteúdo** vira uma página: `/pt-br/enem/matematica/provas-anteriores`, `/quizzes`, `/flashcards`, `/resumos`, `/redacoes-modelo`. Há também páginas por vestibular e por cronograma. Elas têm FAQ, a data "Atualizado em" e chamadas para "Comece grátis", e o PDF da prova é baixável. Existe um **SEO Team Lead** dedicado, e a API tem até um `chat/seo`. Os cookies de atribuição rastreiam qual página de SEO converte.

### Embaixadores e criadores (o segundo canal) ✅

Programa no Brasil:
- **R$ 11 por venda** feita pelo link ou cupom do embaixador.
- **Desafios quinzenais com prêmios de até R$ 1.000** no TikTok e no Instagram (a meta description fala em "R$ 1.000/mês"; a página se contradiz).
- **5 meses do Ultimate grátis**, renovados conforme o número de vídeos postados.
- Os melhores viram parceiros pagos. Não há mínimo de seguidores; a entrada é por DM no TikTok.

No Instagram, aparecem **posts em colaboração com criadoras de "studygram"** (por exemplo, perfis de Redação ENEM e de vestibulandas de Biomedicina).

### Redes do Brasil ✅

| Canal | Números | Observação |
|---|---|---|
| TikTok @simplestudy.br | 7,1 mil seguidores, 158 mil curtidas | Vídeos na voz de estudante (POV, memes, sons em alta): "todo dia um simulado diferente", "o que estudar em junho para o ENEM", "ISSO VAI TE SALVAR NO ENEM". Hashtags #enem2026 #simulados #resumos #appdeestudos. Visualizações de algumas centenas a cerca de 7,7 mil |
| Instagram @simplestudy.br | 6,9 mil seguidores, 672 posts | Bio: "Seu novo app de estudos favorito". Muitos collabs com criadoras |
| YouTube | **6 inscritos** | Abandonado |

### Anúncios pagos

- Na **Biblioteca de Anúncios da Meta**, não encontrei anúncios com "SimpleStudy" veiculados no Brasil. ❓ A busca da biblioteca é fraca, e eles têm Meta Pixel e TikTok Pixel instalados, então provavelmente fazem ou já fizeram retargeting ou anúncios no TikTok, que não aparecem lá. **Não tenho certeza.**
- O estilo do vídeo é UGC de estudante, não propaganda produzida. Barato e escalável.

---

## 7. Fraquezas e pontos cegos deles (onde a Easy pode atacar)

1. **Localização mal feita no Brasil.** O título da página é "SimpleStudy Brazil (USD$) Pricing", o link é da App Store irlandesa, o telefone é +353 e há páginas em inglês misturadas. Na Play Store, um aluno reclama que **o conteúdo de História do Brasil tem erros, foca em datas e não bate com os vestibulares**, e outro aponta problemas de tradução. ✅
2. **Conteúdo genérico.** Ninguém usa o próprio material (apostila do cursinho, caderno, vídeo). Esse é exatamente o diferencial da Easy. ✅
3. **Números inflados e contraditórios:** 500 mil, 1M, 1,5M e 350 mil usuários; 97% e 98% de "notas melhores"; "5.0 de 5.000 avaliações" contra 4,2 no Trustpilot com 164 avaliações. ✅
4. **Trustpilot:** reclamações de **cobrança indevida** ("cobrou 4 vezes em 5 minutos"), plano grátis restrito demais ("uma lição por dia"), questões escritas erradas e navegação difícil. Elogios: resumos bons e suporte rápido. ✅
5. **A correção de redação fica só no Ultimate** (R$ 49,90 por mês), e no Brasil não aparece como recurso de destaque. As páginas do Brasil quase não citam IA. ✅
6. **O foco é escolar e de vestibular.** Não atende concurso nem faculdade. ✅
7. **O ritmo nas redes brasileiras é baixo** (cerca de 7 mil seguidores) para quem diz ter 100 mil alunos no país. 🔶 Ou o número de alunos está inflado, ou eles vêm por SEO ou escolas, não pelas redes.

---

## 8. Comparação de funcionalidades: SimpleStudy × Easy Education

| Recurso | SimpleStudy | Easy |
|---|---|---|
| Gerar quiz e flashcards **do material do aluno** (PDF, foto, YouTube) | ❌ | ✅ |
| Chat de IA que **executa ações** (cria quiz, simulado, plano) | ❌ (só tutor) | ✅ |
| Correção de redação por IA nas 5 competências do ENEM | 🟡 só no Ultimate | ✅ nos planos pagos |
| Revisão espaçada | ❌ não citada | ✅ |
| Plano de estudos diário com cronômetro e trilha | Parcial (metas e progresso) | ✅ |
| Concurso e faculdade | ❌ | ✅ |
| Provas anteriores do ENEM | ✅ desde 2009, em PDF | ✅ 902 questões (2019 a 2023), interativas |
| **Outros vestibulares** (FUVEST, UNICAMP...) | ✅ 12 | ❌ |
| **Biblioteca de resumos e redações-modelo prontos** | ✅ | ❌ |
| **App nativo** iOS e Android | ✅ | ❌ (só web) |
| **Plano anual** | ✅ (cerca de 58% mais barato) | ❌ |
| **Venda B2B para escolas** + painel do professor + Exam Builder | ✅ | ❌ |
| **Fluxo de compra pelos pais** | ✅ | ❌ |
| **Programa de embaixadores e indicação** | ✅ | ❌ |
| **SEO programático** | ✅ forte | ❌ |
| **E-mail e push de retenção** (Customer.io) | ✅ | ❌ (só notificação dentro do app) |
| Login com Google funcionando | ✅ (+ TikTok) | ❌ (botão existe, provedor desligado) |
| Plano grátis | ✅ conteúdo limitado + 5 dias de Premium | ✅ provas do ENEM sem IA + 7 dias grátis |
| Garantia | 14 dias | 7 dias |
| Pix | ❓ não verificado | ❌ |

---

## 9. Contexto da Easy Education (para quem for analisar)

Lido do repositório em 10/10/2026:

- **Stack:** Next.js 16, Supabase (Postgres, Auth e Storage), Prisma, Gemini (`gemini-2.5-flash-lite` como modelo principal, com reservas), Stripe e Vercel.
- **Planos no código** (`src/lib/plans.ts`): **Gratuito** (provas anteriores do ENEM, desempenho e revisão, **sem IA**), **Básico R$ 19,90** e **Completo R$ 34,90**, só mensais e com 7 dias grátis. ⚠️ Os documentos internos se contradizem: `docs/produto-easy-education.md` e `.agents/product-marketing.md` ainda falam em R$ 26,90 e R$ 46,90.
- **Teto de custo de IA por aluno por mês:** Gratuito R$ 1, Básico R$ 4,90, Completo R$ 14,90.
- **Estado:** no ar em `easy-education-tau.vercel.app`, com o **Stripe em modo de teste**. Cerca de 13 contas. A cota do Gemini ainda está no plano grátis.
- **Pendências conhecidas:** Pix, Termos de Uso e Privacidade, e-mail de contato, notificações fora do app, login Google, depoimentos reais. A landing promete coisas que o app ainda não entrega: simulado cronometrado, 30 questões e SM-2 com 4 notas.
- **Posicionamento atual:** "ferramenta geral para qualquer estudante" (escola, faculdade, vestibular, concurso). O ENEM aparece só na redação.

---

## 10. Perguntas para a análise (com minha opinião, que deve ser contestada)

1. **Posicionamento: "geral" ou "ENEM"?** O SimpleStudy já ocupa "app de ENEM com conteúdo pronto" no SEO e nas escolas. Brigar ali exige conteúdo e distribuição que a Easy não tem. *Minha opinião:* a Easy deveria liderar com "**o SEU material vira treino + redação corrigida na hora**", que eles não fazem, e usar o ENEM como porta de entrada do SEO, não como a identidade inteira.
2. **Copiar o plano anual?** *Minha opinião:* sim, e rápido. É o principal fator de preço deles e melhora o caixa. Mas a conta de custo de IA da Easy precisa fechar para 12 meses.
3. **A Easy consegue ter um plano grátis competitivo?** O grátis deles é barato porque o conteúdo é pré-gerado. A Easy já começou a caminhar para isso: o banco compartilhado reaproveita questões entre alunos. *Pergunta-chave:* dá para pré-gerar quizzes e flashcards por tópico do ENEM, uma vez, e liberar no grátis com custo perto de zero?
4. **Vale montar um programa de embaixadores parecido** (comissão por venda + desafios)? É barato, e o conteúdo de UGC deles é simples. O risco é atrair só caçadores de prêmio.
5. **SEO programático:** a Easy tem 902 questões oficiais do ENEM. Páginas públicas por questão ou tópico com resolução comentada poderiam disputar as mesmas buscas. Cuidado com a licença CC BY-ND do INEP (ver `docs/fontes-questoes.md`).
6. **B2B para escolas:** é cedo demais para a Easy? *Minha opinião:* sim. Primeiro é preciso provar retenção no B2C. Mas um painel para os pais pode ser barato e ajudar na conversão, já que quem paga não é quem usa.
7. **App nativo:** precisa agora ou um PWA resolve? Eles têm 500 mil+ downloads na Play Store; a loja é um canal de aquisição, não só um formato.
8. **Antes de tudo isso:** sem Pix, sem Termos e Privacidade e com o Stripe em teste, nenhuma das ideias acima importa. A Easy está disputando com uma empresa que tem 25 pessoas e investimento. A vantagem possível é velocidade e foco, não amplitude.

---

## Fontes

- Site: https://simplestudy.com · https://simplestudy.com/pt-br · https://simplestudy.com/pt-br/pricing · https://simplestudy.com/pricing · https://simplestudy.com/pt-br/schools · https://simplestudy.com/pt-br/parents · https://simplestudy.com/pt-br/embaixadores · https://simplestudy.com/pt-br/vestibular · https://simplestudy.com/pt-br/enem/matematica/provas-anteriores · https://simplestudy.com/about
- API de IA (spec pública): https://api.simplestudy.com/ai/openapi.json
- Imprensa: [Silicon Republic (ago/2023)](https://www.siliconrepublic.com/start-ups/simplestudy-exam-prep-startup-app-junior-leaving-certs-oisin-devoy) · [EdTechReview (set/2024)](https://www.edtechreview.in/news/simplestudy-gears-up-for-international-expansion-seeks-6m-funding/) · [Maddyness UK (out/2025)](https://www.maddyness.com/uk/2025/10/14/reinventing-revision-how-simplestudy-is-making-learning-fun-again/) · [Local Enterprise Office Cork](https://www.localenterprise.ie/corknorthandwest/case-studies/simplestudy.html) · [FundedIQ](https://fundediq.co/simplestudy-simplestudy-ie-funding/)
- Vagas: [Head of Growth](https://wellfound.com/jobs/4546023-head-of-growth) · [GTM Lead B2B](https://wellfound.com/jobs/4546022-go-to-market-lead-b2b)
- Reviews: [Trustpilot](https://au.trustpilot.com/review/simplestudy.ie) · [App Store](https://apps.apple.com/app/id6463741735) · [Google Play](https://play.google.com/store/apps/details?id=com.app.simplestudy)
- Redes: [TikTok @simplestudy.br](https://www.tiktok.com/@simplestudy.br) · [Instagram @simplestudy.br](https://www.instagram.com/simplestudy.br/) · [YouTube](https://www.youtube.com/channel/UC9KK061WcspQLN16AqThFgQ) · [Meta Ad Library](https://www.facebook.com/ads/library/)
