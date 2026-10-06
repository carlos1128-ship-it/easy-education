# Easy Education — documento do produto

Atualizado em 06/10/2026, a partir da leitura do código, da landing, do banco de dados e das conversas de construção do produto. Tudo o que está descrito como "faz" foi conferido no código. O que a landing promete e o app ainda não entrega está na seção 11.

---

## 1. Em uma frase

Easy Education é uma plataforma de estudos com inteligência artificial que transforma o material do próprio aluno (PDF, foto do caderno ou só o nome da matéria) em treino pronto: questões com explicação, flashcards que voltam na hora certa, simulados, plano de estudos diário e correção de redação na hora.

Slogan interno: **"Estude melhor, não apenas mais."**

Título da landing: **"Transforme qualquer material de estudo em treino."**

---

## 2. A mensagem que o produto quer passar

**Promessa central:** você abre o app e já sabe o que estudar. Seu material vira prática, a revisão do dia já vem pronta e cada erro vem explicado.

**Ideias que a comunicação repete:**
- **Usa o que você já tem.** Apostila, foto do caderno, matéria avulsa. O aluno não precisa montar nada à mão.
- **Retorno imediato.** Cada alternativa explicada na hora, redação corrigida no mesmo dia, não uma semana depois.
- **Constância sem culpa.** Plano diário, ofensiva, meta do dia, trilha de níveis e troféus transformam estudar em hábito, com a coruja como companhia.
- **Honestidade.** A IA pode errar, e o produto diz isso. Por isso toda questão traz explicação e a redação mostra o motivo de cada nota. "Se algo não bater com o seu material, siga o material."
- **Serve para qualquer estudante.** Escola, faculdade, vestibular e concurso. O ENEM aparece só onde o recurso segue esse modelo (a correção de redação).

**Tom de voz:** próximo e direto, de colega que já passou pela prova. Frases curtas, segunda pessoa ("você"), poucas exclamações, encorajador e prático, com leveza (a coruja dá o toque divertido).

**Palavras que usa:** apostila, matéria, revisar, questão, simulado, redação, nota, competência, plano de estudos.
**Palavras que evita:** "grátis" (o produto é pago), "revolucionário", "potencialize", "desbloqueie" e jargão técnico sem explicação.

---

## 3. Para quem foi feito (persona)

### Persona principal: o estudante brasileiro com prova marcada

- Tem entre 15 e 30 anos, estuda pelo celular e pelo notebook e usa a IA no dia a dia.
- Tem muito material (apostila, resumo, lista, vídeo salvo) e pouco tempo até a prova.
- Não sabe por onde começar nem o que já esqueceu.
- Sente ansiedade com a data da prova, culpa por não estudar o suficiente e a sensação de estudar muito e render pouco.

**Perfis dentro da mesma persona** (o objetivo escolhido no cadastro muda o estilo das questões):
| Perfil | Como o app adapta |
|---|---|
| Ensino médio (provas da escola) | Linguagem clara, conteúdo visto em sala |
| ENEM e vestibular | Textos-base, situações do cotidiano, interpretação |
| Faculdade | Profundidade técnica e termos da área |
| Concurseiro | Padrão de banca, cobrança literal e pegadinhas comuns |
| (também aceita) SAT e processos internacionais | Raciocínio e leitura crítica |

### Quem paga
Muitas vezes são os pais: **quem paga não é quem usa**. Por isso a landing destaca preço por dia (menos de R$ 1 no Básico), garantia de 7 dias e cancelamento livre.

### Quem não é o público (anti-persona)
Quem quer só videoaula passiva e quem não vai praticar. O produto cobra ação do aluno.

### Trabalhos que o aluno quer resolver ("jobs to be done")
- "Quero treinar com questões da matéria que estou estudando agora."
- "Quero minha redação corrigida hoje, não daqui a uma semana."
- "Quero abrir o app e já saber o que estudar."

---

## 4. Problemas que resolve

| Dor do aluno | Como o produto responde |
|---|---|
| Relê o capítulo inteiro para achar o que esqueceu | Flashcards com revisão espaçada: cada cartão volta pouco antes de ser esquecido |
| A dúvida só aparece na hora da prova | Quizzes e simulados do próprio material, com explicação em cada alternativa |
| Correção de redação demora dias e custa por texto | Nota de 0 a 1000 e comentário por competência na hora, por texto ou foto da folha |
| Não sabe o que estudar hoje | Plano semanal com blocos diários; o botão **Iniciar** abre a atividade já gerada |
| Perde a constância | Ofensiva, meta diária, notificações, trilha de 63 níveis e troféus |
| Montar flashcards e resumos à mão toma o tempo da prática | A IA gera tudo em poucos segundos |
| Material de cursinho é genérico | A prática sai do que o aluno enviou |
| Não sabe onde está errando | Painel de desempenho por matéria, "matérias com mais erros" e mapa de calor de atividade |

---

## 5. Nicho e utilidade

- **Categoria:** ferramenta de estudos com IA, de uso geral. O aluno procura como "app para estudar", "gerar questões do PDF", "flashcards com IA" e "corretor de redação".
- **Tipo:** SaaS B2C por assinatura mensal, web responsivo (celular e computador). Não há aplicativo nativo.
- **Mercado:** estudantes brasileiros, em português do Brasil, com preços em reais.
- **Utilidade principal:** reduzir o tempo entre "tenho um material" e "estou praticando com ele", e fechar o ciclo prática → erro explicado → revisão → desempenho.

**Concorrência**
- Plataformas de ENEM com banco de questões: questões genéricas e correção demorada ou limitada.
- ChatGPT e similares: servem, mas exigem saber pedir, não guardam histórico de desempenho nem agendam revisão.
- Estudar com apostila, resumo e Anki: funciona, mas é lento de montar e não corrige redação.

---

## 6. O que o produto faz (funcionalidade por funcionalidade)

### 6.1 Entrada e conta
- Cadastro com nome, e-mail e senha (força da senha indicada), e login. Visual novo, mesma lógica nas duas telas.
- Botão **Entrar com Google** já está no código. Falta ativar o provedor no Supabase.
- Recuperação de senha por e-mail.
- Tema claro e escuro automático, seguindo o computador.

### 6.2 Assinatura e pagamento
- Dois planos: **Básico R$ 26,90/mês** e **Completo R$ 46,90/mês**. Os dois têm todas as ferramentas; o Completo tem limites maiores de IA.
- Fluxo: botão do plano na landing → cadastro → escolha do plano → pagamento no Stripe → onboarding → app.
- Sem assinatura ativa, o app e a IA ficam bloqueados.
- Página **Assinatura** no app: plano, próxima cobrança, portal do Stripe (trocar cartão, mudar de plano, cancelar, faturas) e **garantia de 7 dias** com reembolso automático e cancelamento imediato.
- Limites diários de IA: Básico 25 gerações e 60 mensagens de chat; Completo 60 gerações e 150 mensagens.

### 6.3 Onboarding
Quatro perguntas rápidas: objetivo (provas escolares, ENEM, vestibular, faculdade, concurso, SAT), data da prova, nível (iniciante, intermediário, avançado), minutos por dia (de 1h a 8h) e método de estudo (Pomodoro, revisão espaçada, Active Recall, blocos de estudo), mais matérias com dificuldade de 1 a 5. Ao final, a IA monta o plano da semana.

### 6.4 Arquivos
Envio de **PDF, TXT ou foto** (PNG, JPG, WebP) de até 20 MB (10 MB para imagem). Para PDF e TXT o app extrai o texto; para foto, a IA transcreve o texto e descreve fórmulas, gráficos e tabelas. O arquivo fica privado, na pasta do próprio aluno, e serve de base para quizzes e flashcards.

### 6.5 Quizzes
Questões de múltipla escolha (A a D) geradas a partir de matéria, assunto ou arquivo, de 5 a 20 por quiz, em três dificuldades. Cada questão traz um contexto concreto, alternativas reais e explicação que justifica a resposta certa e aponta por que um distrator está errado. O estilo segue o objetivo do aluno. Gerar leva de 2 a 7 segundos. Ao terminar, o acerto entra no desempenho e conta como estudo do dia.

### 6.6 Simulados
Provas de 5 a 20 questões, também com explicação. Existe um **simulado semanal automático**, criado a partir das matérias estudadas, depois que o aluno completa a primeira semana de estudo.

### 6.7 Flashcards
Decks de 5 a 30 cartões, com pergunta objetiva na frente e resposta curta atrás, gerados do assunto ou do arquivo. A revisão espaçada reagenda cada cartão conforme o aluno responde (errei, difícil ou bom). O app avisa quantos cartões vencem hoje.

### 6.8 Redação
O aluno digita o texto ou **fotografa a folha escrita à mão**, confere a transcrição e pede a correção. Resultado: nota de 0 a 1000, nota e comentário por cinco competências (norma culta, compreensão do tema, argumentação, coesão e proposta de intervenção), pelo menos dois pontos fortes e duas melhorias acionáveis, e feedback geral. O formulário usa o modelo ENEM (o código ainda aceita SAT, que o plano de melhorias manda remover, porque o SAT não tem redação desde 2021). Histórico guardado.

### 6.9 Plano de estudos e cronômetro
Plano semanal de 7 dias, com até 2 blocos por dia (estudo, revisão, simulado ou redação), ajustado a objetivo, data da prova, horas por dia, matérias e método. Em cada bloco, **Iniciar** liga um cronômetro no canto da tela e abre a atividade pronta (quiz, flashcards, simulado ou redação). Se o aluno já começou o mesmo bloco no dia, o app reaproveita o que foi gerado. O tempo é registrado ao concluir.

### 6.10 Trilha e troféus
A trilha liga o plano a uma progressão de **63 níveis**, em 9 seções de 7 dias. Cada dia concluído vale um nível; cada seção dá um troféu (Bronze, Prata, Ouro, Esmeralda, Safira, Rubi, Ametista, Diamante e Lendário). Ao terminar tudo, a trilha recomeça e os troféus ficam guardados na sala de troféus. Um dia conta como concluído quando o aluno estuda os minutos planejados ou faz a atividade que o plano pede para aquele dia.

### 6.11 Chat com IA que age
O chat responde dúvidas de conteúdo em texto simples e **executa ações**: cria quiz, simulado, flashcards ou plano de estudo a partir de uma frase ("monta um simulado de matemática") e leva o aluno até o resultado. Lê o contexto de um arquivo enviado e, quando faltam detalhes, usa valores padrão em vez de interrogar.

### 6.12 Desempenho
Painel com evolução geral, desempenho e evolução por matéria, histórico de redações, mapa de calor de atividade e as matérias com mais erros. Alimenta a revisão e as notificações.

### 6.13 Motivação e hábito
- **Ofensiva:** dias seguidos com estudo ou quiz concluído.
- **Meta diária** em minutos, definida no onboarding.
- **Notificações no app** (sininho), calculadas com dados reais: ofensiva, meta, flashcards vencendo, simulado novo e quizzes não terminados. Há espaço pronto para promoções.
- **Coruja mascote** que reage a acertos, erros, conclusão e inatividade, com sons de acerto.
- Busca global por estudos, arquivos e quizzes.

---

## 7. Jornada do aluno

1. **Descoberta:** landing com a dor ("muito material, pouco tempo"), os recursos em exemplos visuais, planos, perguntas frequentes.
2. **Decisão:** escolhe Básico ou Completo, vê garantia de 7 dias e cancelamento livre.
3. **Cadastro e pagamento:** conta, Stripe, confirmação imediata.
4. **Ativação:** quatro perguntas, plano da semana criado na hora.
5. **Primeiro valor:** clica em **Iniciar**, o cronômetro liga e o primeiro quiz ou os flashcards do dia já estão prontos.
6. **Hábito:** ofensiva, meta, trilha, notificações, simulado semanal.
7. **Retenção:** desempenho visível, revisão espaçada puxando o aluno de volta, troféus a cada sete dias concluídos.
8. **Saída ou troca:** portal do Stripe para mudar de plano ou cancelar; garantia nos 7 primeiros dias.

---

## 8. Como a inteligência artificial funciona (e seus limites)

- **Motor:** Google Gemini. Quizzes, simulados e flashcards usam o modelo mais rápido disponível com dois modelos de reserva. A lista é dividida em partes pequenas pedidas ao mesmo tempo, com prazo total de 19 segundos.
- **Tempo medido em teste:** quiz de 10 questões em 5 s, de 20 em 6,5 s, e 20 a 30 flashcards em 2 s (antes chegava a mais de 1 minuto).
- **Formato fixo:** a resposta da IA segue um esquema, então não vem cortada nem fora do padrão. Questões com texto genérico ("alternativa correta", "distrator plausível") são descartadas.
- **Correção de redação** usa raciocínio mais longo, porque isso melhora a nota.
- **Proteções de custo:** limite por minuto, limite diário por plano e tamanho máximo dos textos enviados.
- **Limites reais:** a IA pode errar (a landing avisa), a correção de redação segue o modelo do ENEM e não substitui um professor, e o plano gerado tem no máximo dois blocos por dia.

---

## 9. Tecnologia e segurança (resumo)

Next.js 16 (App Router), React 19, TypeScript, Tailwind e shadcn/ui; Supabase (login, banco PostgreSQL e arquivos); Prisma; Stripe para cobrança; Gemini para IA; hospedagem na Vercel, região de São Paulo.

Segurança já tratada: cada aluno só acessa os próprios dados (RLS em todas as tabelas), bucket de arquivos privado, rotas de API exigem login, redirecionamentos só para caminhos internos, cabeçalhos contra iframes e limite de tentativas no cadastro. O webhook do Stripe valida assinatura e processa cada evento uma vez. A assinatura só é gravada pelo servidor, o aluno não consegue alterá-la.

---

## 10. Estado atual (06/10/2026)

- No ar em `easy-education-tau.vercel.app`, com cobrança ligada em modo de **teste** do Stripe (cartão de teste, sem dinheiro real).
- Banco com 13 contas anteriores à cobrança, que agora caem na tela de planos.
- **Pendências do dono:** ativar o login com Google; trocar o Stripe para o modo real quando for cobrar de verdade (recriar planos, portal e webhook na conta real); ativar o faturamento da chave do Gemini no Google AI Studio para suportar vários alunos ao mesmo tempo.

---

## 11. Onde a promessa e o produto ainda não batem

Itens que vale corrigir antes de crescer, porque o aluno vai perceber:

1. **Simulado "no tempo de prova".** A landing mostra um cronômetro regressivo ("1:12:40 restantes") e o chat promete "tempo de prova". Hoje o simulado não tem contagem regressiva. Ou se constrói, ou se tira o exemplo.
2. **Simulado de 30 questões.** O exemplo da landing mostra "questão 12 de 30"; o máximo real é 20.
3. **"Algoritmo SM-2" e quatro notas.** A landing fala em SM-2 e mostra quatro botões (Errei, Difícil, Bom, Fácil) com prazos. O código implementa uma versão simplificada, com três notas (errei, difícil, bom) e um cálculo próprio de intervalo.
4. **Limites dos planos sem número.** A landing diz "limite padrão" e "limite maior" sem dizer quanto. Os números reais hoje são 25 e 60 (Básico) contra 60 e 150 (Completo) por dia. Os campos de limite por mês estão em branco, de propósito.
5. **Termos de Uso e Política de Privacidade não existem.** Para cobrar, com dados de menores de idade e pagamento, isso é necessário (LGPD e Código de Defesa do Consumidor). O rodapé não tem os links.
6. **Sem e-mail de contato nem suporte.** O Stripe e a página de recibo pedem um canal; a landing não tem.
7. **Pagamento só por cartão.** Não há Pix nem boleto em assinatura (ver a resposta do Stripe abaixo). Para o público estudantil e para pais pagando, isso reduz a conversão.
8. **Notificações só dentro do app.** Não há e-mail nem push. A ofensiva depende de o aluno abrir o app.
9. **Sem depoimentos nem números reais.** A seção de avaliações está desligada. A landing usa exemplos marcados como ilustrativos.
10. **Google desligado**, apesar de o botão aparecer.
11. **Correção de redação só no modelo ENEM.** Quem faz vestibular com critérios próprios ou concurso com redação não tem modelo. Além disso, a nota em pontos é uma estimativa de IA sem calibração com corretores humanos.

---

## 12. Perguntas que o dono deve responder para guiar o próximo passo

- Qual é o público de entrada: o aluno do ensino médio (com pais pagando) ou o universitário e concurseiro (que paga sozinho)? Isso define canais, preço e Pix.
- Existe meta de alunos pagantes para o primeiro mês? A capacidade da IA (custo por aluno) depende disso.
- O Completo deve ser vendido por mais limites de IA, ou por recursos exclusivos (por exemplo, mais redações, simulados ilimitados)?
- Haverá plano anual com desconto? Hoje só existe mensal.
