# Prompt: nova coruja da Easy Education (estilo, poses, cenas e substituição no app)

Este arquivo tem **três prompts**, para usar nesta ordem:

1. **Prompt A, folha da personagem.** Vai para o gerador de imagem (ChatGPT/GPT Image, Gemini, Midjourney) ou para um ilustrador. Define a coruja nova. **Só passe para o B depois de aprovar a folha.**
2. **Prompt B, poses e cenas.** Mesmo gerador, **sempre anexando a folha aprovada como referência**.
3. **Prompt C, substituição no app.** Vai para o Claude que trabalha no repositório.

---

## Regras que valem para os três

- **Copie o nível de acabamento, não personagens.** A referência é o tipo de ilustração de apps como o do concorrente e o do Duolingo: vetor chapado, cores vivas, formas redondas. **Nunca escreva no prompt "estilo Duolingo" ou "como o elefante do SimpleStudy"**: descreva as características. Isso evita que o gerador copie elementos de marca alheios. Também não reproduza as composições deles (o elefante na rede com a girafa, o monge flutuando com ícones). Use as mesmas ideias de situação, com cenas próprias.
- **Mantenha a identidade da coruja:** óculos redondos, moletom com o capelo no peito, penacho na cabeça, bico e pés laranja.
- **Corpo branco, não azul. Essa decisão é deliberada:**
  - O azul do elefante deles (#2080FF) é quase igual ao azul da Easy (#2563EB).
  - Coruja é o bicho do Duolingo.
  - Uma coruja azul ficaria "o elefante deles com cara do Duo". Branca com moletom azul elétrico e acentos laranja e ciano, ela é só da Easy.
  - Se mesmo assim quiser testar o corpo azul, gere uma variante e compare as duas lado a lado com as dos concorrentes antes de decidir.

---

## Prompt A: folha da personagem

> Cole no gerador de imagem. Anexe uma das poses atuais (por exemplo `coruja-feliz-parada.webp`) como referência **de personagem**, não de estilo.

```
Character design sheet for an original mascot: a young owl student for a Brazilian study app.

STYLE (most important):
- Flat 2D vector illustration, bold and vibrant, modern mobile-app mascot style.
- Chunky rounded geometric shapes, soft rounded silhouette, no sharp corners.
- ONE flat cel-shadow tone per color (no gradients, no painterly texture, no fur or feather texture, no 3D render).
- Clean thin outline in deep navy (#1E3A8A) around the character.
- Big expressive eyes, emotion comes from eyes, eyebrows and body pose.
- Thick simple limbs: wings work like little hands with 3 rounded "feather fingers".

CHARACTER (keep these exactly):
- Small round owl, body mostly WHITE with a very light blue shadow (#DBEAFE).
- Two small feather tufts on top of the head, one bigger curl on the forehead.
- Round glasses with navy frames (#1E3A8A), white eye whites, navy pupils.
- Electric blue hoodie (#2563EB, shadow #1D4ED8) with a small white graduation-cap logo on the chest.
- Orange beak and feet (#F59E0B, shadow #D97706).
- Proportions: head ~45% of total height, body short and round, cute and friendly, age feels like a teenage student.

SHEET LAYOUT on a plain white background:
- Turnaround: front, 3/4 left, side, back.
- 8 expressions (head only): happy, celebrating, determined, sleepy, winking, in love (heart eyes), singing, attentive.
- Color palette swatches with hex codes.
- Size comparison next to a book and a smartphone.
No text other than labels. No other characters. No brand logos.
```

**Como aprovar:**
- Silhueta reconhecível mesmo pequena (48 px).
- Óculos e moletom presentes em todas as vistas.
- Mesmas proporções nas 4 vistas.
- Nada que lembre o Duo (corpo verde, formato de "gota") ou o elefante deles.

---

## Prompt B: poses e cenas

**Use este bloco base em toda geração** e troque só a linha `SCENE`:

```
Use the attached character sheet as the exact reference for the owl (same proportions, glasses, blue hoodie with cap logo, white body, orange beak and feet, navy outline).
Flat 2D vector illustration, vibrant colors, one flat shadow tone, no gradients, no textures, no 3D.
Minimal scene: only the props described, lots of white space, transparent or pure white background, soft round ground shadow under the character.
Square 2048x2048, character centered, nothing cropped. No text, no letters, no logos except the cap logo on the hoodie.
SCENE: <descrição>
```

### B1. Poses de reação (substituem os 8 humores atuais e acrescentam novos)

| Arquivo | SCENE |
|---|---|
| `coruja-feliz` | owl smiling with eyes closed in happy arcs, wings clasped near chest, tiny sparkles |
| `coruja-comemorando` | owl jumping with both wings raised, beak open, confetti around |
| `coruja-determinada` | owl with focused eyebrows, wing making a fist, small blue flame above head |
| `coruja-sonolenta` | owl half-closed eyes, glasses slightly crooked, small "Zzz" bubbles |
| `coruja-piscando` | owl winking one eye, one wing giving a thumbs-up |
| `coruja-apaixonada` | owl with heart-shaped eyes, small floating hearts |
| `coruja-cantando` | owl singing with eyes closed, music notes floating |
| `coruja-atenta` | owl leaning forward, eyes wide, one wing on chin |
| **novo** `coruja-pensando` | owl looking up, wing scratching head, small question mark |
| **novo** `coruja-surpresa` | owl with wide eyes, feathers puffed, glasses jumping on the beak |
| **novo** `coruja-errou` | owl slightly deflated, small sweat drop, encouraging half-smile (sad but not crying) |
| **novo** `coruja-falando` | owl with beak open mid-sentence, one wing gesturing as if explaining |
| **novo** `coruja-acenando` | owl waving hello with one wing, friendly smile |

### B2. Cenas por tela do app

| Arquivo | Onde entra | SCENE |
|---|---|---|
| `cena-hero` | Hero da landing | owl at a desk feeding a stack of PDF pages and a phone photo into a glowing funnel that outputs colorful quiz cards and flashcards |
| `cena-boas-vindas` | Onboarding e cadastro | owl waving in front of an open door with a backpack |
| `cena-plano` | Plano de estudos | owl pressing a big round "start" button next to a giant stopwatch and a weekly calendar |
| `cena-arquivos` | Arquivos | owl carrying a tall stack of papers and a camera, papers floating |
| `cena-chat` | Chat com IA | owl with a headset, a big speech bubble with a lightbulb |
| `cena-flashcards` | Flashcards | owl juggling three colorful flashcards |
| `cena-revisao` | Revisão | owl with a big magnifying glass looking at a card with a check mark |
| `cena-simulado` | Simulados | owl filling an answer sheet with a pencil, wall clock behind |
| `cena-desempenho` | Desempenho | owl standing next to a rising bar chart, pointing up proudly |
| `cena-trilha` | Trilha | owl climbing a winding path up a small hill with a flag on top |
| `cena-trofeus` | Sala de troféus | owl on a podium holding a shiny trophy |
| `cena-fechar-dia` | Fechar o dia | owl relaxing in a hammock between two small trees, moon and stars, open notebook on its belly |
| `cena-ofensiva` | Ofensiva | owl lifting a dumbbell made of two books, small flame next to it (academia) |
| `cena-gerando` | Carregando ou gerando com IA | owl riding a small scooter fast, papers flying behind, speed lines (moto) |
| `cena-limite` | Limite do plano atingido | sleepy owl hugging a pillow, small clock showing tomorrow |
| `cena-vazio` | Telas vazias | owl sitting on a closed book, looking at the viewer, waiting |
| `cena-404` | Página não encontrada | owl holding an upside-down map, confused, small question marks |
| `cena-erro` | Erro do sistema | owl tangled in a cable, embarrassed smile |
| `cena-redacao-nota` | Resultado da redação | owl holding up a paper with a big star sticker |

### B3. Cenas por matéria e objetivo

Usadas no cabeçalho de cada matéria, no simulado da matéria e nos cards do plano. **Os nomes de arquivo seguem `src/lib/subjects.ts`.**

| Arquivo | SCENE |
|---|---|
| `materia-matematica` | owl solving an equation on a small chalkboard, ruler and compass |
| `materia-portugues` | owl reading a giant open book, letters floating out of it |
| `materia-literatura` | owl with a feather quill writing on old paper, small stack of classic books |
| `materia-redacao` | owl writing at a desk with a red pen, crumpled drafts around |
| `materia-historia` | owl as an explorer in front of ancient Roman columns and an arch, holding a scroll (Roma) |
| `materia-geografia` | owl in a small hot-air balloon above a globe |
| `materia-biologia` | owl looking into a microscope, potted plant and a leaf |
| `materia-quimica` | owl with safety goggles over its glasses, colorful bubbling flasks |
| `materia-fisica` | owl next to a small rocket and a magnet, motion arrows |
| `materia-filosofia` | owl in a thinking pose sitting on a Greek column, thought cloud |
| `materia-sociologia` | owl talking with a small group of diverse little birds, speech bubbles |
| `materia-ingles` | owl with a backpack and passport, speech bubble "Hi" style without letters (use a waving-hand icon) |
| `materia-espanhol` | owl with a guitar and a sun |
| `materia-artes` | owl painting on an easel with a paint palette |
| `materia-atualidades` | owl reading a newspaper with a coffee mug |
| `materia-educacao-fisica` | owl running with a stopwatch, sneakers |
| `objetivo-enem` | owl walking confidently into an exam building with an answer card |
| `objetivo-etec` | younger-looking owl (same character) with a backpack and a small tablet, school gate |
| `objetivo-concurso` | owl in a tie holding a thick document folder |
| `objetivo-faculdade` | owl throwing a graduation cap in the air |
| `objetivo-escola` | owl with backpack and lunchbox in front of a school |

### Dicas de produção (honestas)

- **Consistência é o ponto fraco dos geradores de imagem.** Gere em lotes pequenos, sempre com a folha aprovada anexada, e jogue fora o que fugir (óculos diferentes, cor errada). Espere refazer de 30% a 50% das imagens.
- **A imagem gerada sai em bitmap.** Para as cenas estáticas, um WebP de boa resolução basta. **Para animar** (Rive, ver o Prompt C, fase 3), a coruja precisa ser **redesenhada ou vetorizada em partes separadas**. A vetorização automática costuma gerar formas sujas; um ilustrador limpando a partir da folha aprovada sai melhor.
- **Direitos:** não tenho certeza de como fica a proteção de um personagem gerado só por IA no Brasil. Se a coruja virar a marca principal, vale ter um ilustrador finalizando a versão oficial e conversar com um advogado.

---

## Prompt C: substituição no app (para o Claude do repositório)

> Cole no Claude que trabalha em `easy-education`. Coloque antes as imagens aprovadas em `public/mascote/v2/` com os nomes da seção B.

```
Contexto: a coruja da Easy Education foi redesenhada (vetor chapado, cores vivas). As imagens novas estão em
public/mascote/v2/ com os nomes: poses (coruja-*.webp), cenas de tela (cena-*.webp) e cenas de matéria/objetivo
(materia-*.webp, objetivo-*.webp). Quero substituir a coruja antiga e espalhar as cenas pelo app.
Não escreva código antes de me mostrar o plano (arquivos, esforço, riscos). Depois de aprovado, implemente.

1. Pipeline de imagens
   - Script em scripts/mascote/ que converte os originais (2048 px) para WebP em 2 tamanhos (1x e 2x, por exemplo
     256 e 512 para poses, 640 e 1280 para cenas), com fundo transparente e qualidade ajustada para cada arquivo
     ficar abaixo de ~60 KB (poses) e ~120 KB (cenas). Mostre os tamanhos finais numa tabela.
   - Nada de WebP animado pesado: as poses são estáticas. O movimento vem de CSS leve (respirar, piscar por
     troca de pose em hover/evento, pop de entrada já existente), sempre respeitando prefers-reduced-motion.

2. Componente da coruja
   - Atualize src/components/mascot/owl-mascot.tsx mantendo a mesma API (mood, size, message).
   - Amplie OwlMood com os novos humores: pensando, surpresa, errou, falando, acenando.
   - Use srcSet 1x/2x. Remova o pré-carregamento dos WebPs animados (usePreloadOwls) se não fizer mais sentido.
   - Revise onde cada humor aparece hoje (quiz-runner, study-run-panel, day-summary-form, study-trail, product-tour,
     dashboard) e proponha onde os humores novos entram (ex.: "errou" na resposta errada, "falando" com balão,
     "acenando" no onboarding).

3. Cenas
   - Crie src/content/mascot-scenes.ts com o mapa: tela -> cena e matéria/objetivo -> cena, usando os nomes de
     src/lib/subjects.ts (com fallback para uma cena genérica quando a matéria não tiver imagem).
   - Componente <MascotScene name=... /> com next/image, tamanhos responsivos, alt descritivo em português e
     carregamento preguiçoso (só a cena do hero carrega com prioridade).
   - Coloque as cenas: hero e seções da landing (substituindo as fotos de banco de imagem de src/content/landing.ts),
     onboarding, telas vazias, 404 e erro, carregamento/geração com IA, limite do plano, fechar o dia, trilha,
     troféus, desempenho, cabeçalho de cada matéria e card do plano de estudos.
   - Não encha a tela: no máximo uma cena por tela; no app a coruja aparece onde há emoção (acerto, erro,
     conclusão, ofensiva, limite), não em todo card.

4. Limpeza
   - Depois de tudo trocado, mova os arquivos antigos de public/mascote/ para public/mascote/_antigo/ (não apague;
     eu decido depois) e confirme com busca no código que nada mais aponta para eles.
   - Atualize docs/produto-easy-education.md e docs/redesign/design-system com as regras do mascote
     (paleta, quando usar cada pose, tamanhos mínimos).

5. Fase seguinte (só planejar agora): animação em Rive
   - Um único arquivo coruja.riv com 3 camadas (corpo/respiração, olhos/piscar, efeitos), Data Binding com
     enum mood (mapeado de OwlMood), triggers acerto/erro/concluido e boolean falando, olhos seguindo o ponteiro,
     carregado só quando visível e com a pose WebP como fallback. Verifique na documentação atual do Rive o pacote
     React e a API de Data Binding antes de propor. Estime o tamanho do .riv e o que muda no componente.
   - Isso depende de um vetor da coruja separado em partes (cabeça, olhos, pálpebras, óculos, bico, asas, pés,
     moletom). Diga exatamente que partes e camadas o ilustrador precisa entregar.

Seja crítico: se alguma cena não fizer sentido no lugar proposto, ou se o peso total de imagens ficar alto
para o celular, diga e proponha alternativa.
```
