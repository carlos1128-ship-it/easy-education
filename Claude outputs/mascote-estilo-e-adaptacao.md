# Mascote: como o SimpleStudy fez o elefante e como adaptar o método para a coruja da Easy

Pesquisa feita em 10/10/2026, inspecionando o site deles no navegador. A imagem de apoio é `mascote-comparacao.png`.

**A regra é simples: copiar o método, não o personagem.** Estilo e técnica não pertencem a ninguém. O desenho do elefante, as poses e as cenas pertencem a eles.

---

## 1. O que eles têm (fatos)

**Personagem:** um elefante azul chamado **"Rob"** (é o nome que aparece nos arquivos). Na página "Sobre" ele vira o mascote "Stud the Elephant". Os nomes não batem, e isso mostra que a marca do personagem ainda não está consolidada.

**Dois formatos:**

1. **Ilustrações estáticas em WebP** para cada contexto do site:
   - deitado na rede ouvindo música (página de preços);
   - de scooter;
   - voando de capa (escolas);
   - de professor e de aluno (cadastro);
   - com notebook;
   - com uma nota boa nas mãos;
   - **socando a coruja verde do Duolingo** (página "Sobre").

   São arquivos leves, de 60 a 800 px.

2. **Uma animação em Rive**, `elephant_monk.riv`, com 95 KB, que aparece em quase todas as páginas, perto do rodapé. É o elefante meditando, flutuando no ar, cercado de ícones de matérias.

**Por dentro do arquivo `.riv`** (inspecionado com o próprio runtime do Rive, no navegador):
- 1 artboard e 1 state machine (`elephant_monk`), **sem nenhum input**. Ou seja, não reage a nada: é um loop decorativo.
- **3 linhas de animação em camadas, rodando ao mesmo tempo:** `Character` (o corpo flutua e "respira", e a sombra no chão encolhe e cresce), `Eyes` (piscar) e `Objects` (os ícones das matérias orbitando).
- **Carregamento preguiçoso:** só começa quando o rodapé chega perto da tela e ainda espera 5 segundos. O mascote não atrasa o carregamento da página.

**Anatomia do estilo:**

| Elemento | Como é |
|---|---|
| Traço | **Sem contorno.** As formas são separadas só pela cor |
| Sombreamento | Estilo "cel": **uma única sombra chapada** (o azul #2080FF com sombra #2060C0) |
| Paleta | 3 a 4 cores: azul principal, azul-sombra, azul-marinho da camiseta (#203060) e o branco dos olhos. Detalhes vêm de cores de acento pontuais |
| Formas | Geométricas e arredondadas, sem pontas, membros grossos, mãos simples |
| Olhos | Grandes, brancos, com pupila preta. Muitas vezes olhando para cima (curiosidade) |
| Expressão | Toda a emoção vem de olhos, sobrancelhas e pose. A boca quase não aparece |
| Cenário | Mínimo: um objeto ou dois e muito espaço em branco |

É o mesmo "dialeto" visual de Duolingo e Headspace: vetor chapado e rig simples. **E esse estilo é escolhido de propósito, porque é o mais barato de animar.** Cada parte é uma forma separada que pode girar, escalar e se deformar sem redesenhar nada.

---

## 2. A coruja da Easy hoje (crítica direta)

O que tem no repositório (`public/mascote/` e `src/components/mascot/owl-mascot.tsx`):

- **8 humores**, cada um em um **WebP animado de 32 quadros, 200×200 px**, de 130 a 275 KB. São cerca de **1,75 MB** no total, mais as versões paradas.
- Para trocar de humor, o componente troca o arquivo inteiro, com um "pop" em CSS. Não há transição entre humores, e a coruja não reage a nada além disso.

**Problemas:**

1. **Estilo pintado, quase 3D**: penas com textura, gradientes suaves e contorno escuro. É bonito parado, mas **não dá para animar por partes**. Cada humor novo exige gerar ou desenhar tudo de novo, e a consistência entre poses já oscila (o formato da cabeça e dos olhos muda de uma pose para outra).
2. **Resolução fixa de 200 px.** Fica borrada em telas retina ou em tamanho grande (landing, tela de troféus).
3. **Peso:** 8 GIFs disfarçados somam quase 1,8 MB. Um `.riv` com os 8 humores e as transições entre eles cabe, em regra, em **50 a 150 KB**. Isso é estimativa minha, baseada nos 95 KB do arquivo deles, que tem cena completa.
4. **Sem reação de verdade.** Hoje a coruja "reage" porque o arquivo é trocado. Com Rive, ela pode piscar sozinha, seguir o mouse com os olhos, comemorar no acerto e murchar no erro, passando de um estado para o outro sem cortes.

**Um ponto estratégico que você não pode ignorar:** coruja é o arquétipo do Duolingo, e o concorrente usa uma imagem do mascote dele **socando uma coruja**. A coruja da Easy é branca e de óculos, bem diferente da Duo verde, o que ajuda. Mas toda decisão de estilo deve **afastar a coruja da Easy da Duo**, não aproximar. Chapar demais, com formas muito redondas e olhos gigantes, aproxima. Minha recomendação é manter os traços próprios: óculos, moletom com capelo, penacho na cabeça e pés laranja.

---

## 3. Como adaptar (o método deles, com a cara da Easy)

### 3.1 Redesenho da coruja em vetor (pré-requisito)

Redesenhar a mesma personagem como **vetor chapado**, peça por peça, já pensando na animação:

- **Paleta presa aos tokens da marca:**
  - corpo e penas: branco #FFFFFF, com sombra em azul bem claro (`brand-tint` #DBEAFE);
  - moletom: `brand` #2563EB, com sombra `brand-strong` #1D4ED8;
  - óculos, pupilas e contorno opcional: `brand-deep` #1E3A8A;
  - bico e pés: laranja (o único acento quente).
- **Sombra única chapada**, sem gradiente e sem textura de pena.
- **Contorno:** decisão de marca. *Minha opinião:* manter um contorno fino em `brand-deep`. Diferencia do Rob e da Duo (os dois são sem contorno), e a coruja branca precisa de borda para não sumir em fundo claro.
- **Camadas separadas** para o rig:
  - corpo, cabeça e penacho;
  - **olho esquerdo e olho direito**, cada um com branco, pupila e pálpebra;
  - armação dos óculos;
  - bico (em duas partes, para "falar");
  - asas esquerda e direita;
  - pés;
  - moletom e o logo do capelo;
  - **acessórios à parte**: coração, estrelinhas, "Zzz", gota de suor, notas musicais, chama da ofensiva e troféu.

Pode ser feito no Figma ou no Illustrator e importado no Rive como SVG, ou desenhado direto no editor do Rive.

### 3.2 Estrutura no Rive: copiar as 3 camadas deles e acrescentar interação

Eles usam 3 camadas paralelas: personagem, olhos e objetos. A Easy deve usar a mesma divisão, **mas com inputs**, que é o que falta no arquivo deles.

**Linhas de animação (timelines):**
- `idle_respira`: o corpo sobe e desce 2 a 3 px e o penacho balança. Fica em loop.
- `olhos_piscar`: aleatório, a cada 2 a 6 segundos.
- Um `pose_*` para cada humor, já existente: `atenta`, `sonolenta`, `piscando`, `feliz`, `comemorando`, `determinada`, `apaixonada` e `cantando`.
- `reacao_acerto` (pulinho com as asas para cima), `reacao_erro` (murcha, com gota de suor) e `reacao_concluido` (comemoração com estrelinhas). São as reações curtas, tocadas uma vez.
- `falando`: o bico abre e fecha, para quando aparece um balão de mensagem.

**Dados controlados pelo app.** O Rive marcou o sistema antigo de "Inputs" como legado e recomenda **Data Binding** (view model):
- `mood`: enum com os 8 humores. Mapeia direto para o tipo `OwlMood` que já existe.
- `acerto`, `erro` e `concluido`: triggers. Encaixam nos sons que já existem em `public/sons/`.
- `falando`: boolean, ligado enquanto o balão de mensagem está na tela.
- *Opcional:* `olharX` e `olharY` (números), ou um listener de ponteiro do Rive, para **os olhos seguirem o mouse ou o dedo**. Custa pouco e é o detalhe que mais dá "vida".

**State machine em camadas:**
1. Camada *Corpo*: idle → pose do humor, com blend de 150 a 250 ms entre humores (nada de corte seco).
2. Camada *Olhos*: o piscar roda sempre e é sobrescrito pelas poses que fecham o olho (sonolenta, piscando).
3. Camada *Efeitos*: as reações one-shot e os acessórios (coração, Zzz, estrelas).

### 3.3 No código da Easy (esboço, para o Claude do projeto implementar)

- Pacote: a documentação atual de data binding usa `@rive-app/react-webgl2`. Também existe o `@rive-app/react-canvas`, que é mais leve. **Não confirmei** se os hooks de data binding estão nos dois; vale checar antes de escolher.
- O `OwlMascot` mantém a mesma API (`mood`, `size`, `message`). Por dentro:
  - Com `prefers-reduced-motion` ligado, ou enquanto o `.riv` não carregou, **mostra a pose parada** (o fallback que já existe).
  - Carrega o `.riv` só quando a coruja entra na tela (IntersectionObserver), como eles fazem, mas **sem os 5 s de espera** dentro do app, onde a reação imediata importa.
  - `mood` → `setValue` no enum. Acerto e erro do quiz → `trigger()`.
  - Um único arquivo `/mascote/coruja.riv`, servido com cache longo.
- Os 8 WebPs animados podem ser apagados depois; ficam só as versões `-parada`, como fallback.

```tsx
// esboço: confirmar nomes na doc de data binding do Rive antes de implementar
const { rive, RiveComponent } = useRive({ src: "/mascote/coruja.riv", stateMachine: "Coruja", autoBind: false });
const vm = useViewModel(rive, { name: "Coruja" });
const vmi = useViewModelInstance(vm, { rive });
const { setValue: setMood } = useViewModelInstanceEnum("mood", vmi);
const { trigger: acerto } = useViewModelInstanceTrigger("acerto", vmi);
useEffect(() => setMood(mood), [mood]);
```

### 3.4 Cenas estáticas (onde o Rob ganha mais)

O maior valor do mascote deles não é a animação: são as **ilustrações de situação** espalhadas pelo site, porque contam o produto sem texto. A Easy deveria ter de 6 a 10 cenas da coruja, exportadas como SVG ou WebP leves, usando o mesmo rig:

| Onde | Cena da coruja |
|---|---|
| Hero da landing | Transformando uma pilha de PDFs e fotos em cards de quiz (a promessa da Easy) |
| Redação | Corrigindo uma folha com caneta vermelha nas cinco competências |
| Plano de estudos | Apertando "Iniciar" com um cronômetro |
| Trilha e troféus | No pódio com o troféu da seção |
| Estado vazio ("nenhum quiz ainda") | Sentada, esperando com um livro |
| Modal de upgrade ou limite | Sonolenta, com "volte amanhã", ou pedindo o upgrade com jeito |
| Página de preços / pais | Entregando o boletim melhorado |
| Erro 404 | Perdida com um mapa |

---

## 4. Como produzir: opções honestas

| Caminho | Prós | Contras |
|---|---|---|
| **Freelancer de Rive** (redesenho + rig + state machine) | Resultado profissional, mais rápido | Custa dinheiro. **Não pesquisei preços de mercado**; peça 2 ou 3 orçamentos com o escopo da seção 3 |
| **Você mesmo no Rive** | Barato. O editor tem plano grátis | Curva de aprendizado de semanas. No plano grátis, **o `.riv` exportado toca uma tela de abertura do Rive**; para tirar, o plano Cadet custa US$ 9 por mês por pessoa (preço da página oficial, out/2026) |
| **Ilustrador vetorial + animador separado** | Cada um no que faz melhor | Mais coordenação |
| **Continuar gerando WebP por IA** | Zero esforço agora | Não escala, pesa, varia entre poses e não reage. É o problema atual |

**Ordem que eu seguiria:**
1. Folha de personagem vetorial: frente, 3/4, 8 expressões e regras de cor.
2. Rive com idle + piscar + os 8 humores + acerto e erro.
3. Trocar o componente.
4. Só então produzir as cenas da landing.

Tudo isso **depois** de lançar com Pix, Termos e Privacidade. Mascote melhor não converte quem não consegue pagar.

---

## 5. O que NÃO fazer

- **Não copiar o elefante, as poses ou as cenas** do SimpleStudy (rede, scooter, monge flutuando com ícones). Use a técnica e invente as próprias situações.
- **Não usar a cena da "briga com o Duolingo"** como ideia. No caso da Easy, uma coruja atacando outra coruja só reforça a comparação.
- **Não colocar mascote em todo canto.** Eles usam o Rive só no rodapé e as ilustrações em pontos-chave. No app, a coruja deve aparecer onde há emoção: acerto, erro, conclusão, ofensiva e limite. Não em cada card.

---

## Fontes

- Arquivos e scripts do site, inspecionados em 10/10/2026: `simplestudy.com/_astro/*rob*.webp`, `cdn.simplestudy.io/assets/frontend/img/seo_landing_page/elephant_monk.riv` e `_astro/footer-animation...js` (carregamento preguiçoso e as três camadas).
- [Rive, preços](https://rive.app/pricing) · [Rive React, Inputs (legado)](https://rive.app/docs/runtimes/react/inputs) · [Rive React, Data Binding](https://rive.app/docs/runtimes/react/data-binding)
- Easy Education: `public/mascote/`, `src/components/mascot/owl-mascot.tsx` e `docs/redesign/design-system/tokens.json` (somente leitura).
