# Design system — Easy Education

Tokens em [`tokens.json`](tokens.json). No código, a fonte da verdade é `src/app/globals.css`
(variáveis de cor em `:root` e `.dark`, fontes em `@theme inline`).

## Tipografia

**Lexend** é a fonte única da interface. Ela é carregada em `src/app/layout.tsx` pelo `next/font/google`
como fonte variável (pesos 100 a 900, subsets `latin` e `latin-ext`, `display: swap`). Não use link do
Google Fonts nem `@import`.

| Variável | Uso |
|---|---|
| `--font-sans` | todo o texto (classe `font-sans`, padrão do `body`) |
| `--font-display` | títulos grandes (mesma Lexend) |
| `--font-mono` | só código e cronômetro: JetBrains Mono |

Fallbacks de sistema no final: `system-ui, -apple-system, "Segoe UI", sans-serif`.

### Escala de pesos

| Peso | Classe | Onde |
|---|---|---|
| ExtraLight 200 | `font-extralight` | números muito grandes, só a partir de 32px |
| Light 300 | `font-light` | subtítulos e descrições grandes, só a partir de 18px |
| Regular 400 | `font-normal` | texto corrido, interface, rodapé |
| Medium 500 | `font-medium` | rótulos, botões, abas, menu, legendas, selos |
| SemiBold 600 | `font-semibold` | rótulos que precisam de mais ênfase |
| Bold 700 | `font-bold` | títulos de seção e de cartão |
| ExtraBold 800 | `font-extrabold` | títulos de página e métricas no dashboard |
| Black 900 | `font-black` | título do hero, métricas da landing, títulos em faixas azuis |

### Papéis

| Elemento | Peso | Cor |
|---|---|---|
| Título do hero | Black 900, palavra-chave em azul | `ink` + `brand` |
| Título misto | parte em Light 300, parte em Black 900 | `ink` + `brand` |
| Títulos de seção | Bold 700 ou ExtraBold 800 | `ink`, ou `brand-deep` em faixas claras |
| Subtítulos grandes (≥18px) | Light 300 | `ink-muted` |
| Números e métricas | Black 900 (landing) ou ExtraBold 800 (app) | `brand` |
| Texto corrido | Regular 400 | `ink` |
| Rótulos, botões, abas, menu | Medium 500 ou SemiBold 600 | `ink` / `on-brand` |
| Legendas, metadados, selos | Medium 500 | `ink-muted` |
| Rodapé e apoio | Regular 400 | `ink-muted` |
| Faixas azuis | Black 900 no título, Light 300 no subtítulo | `on-brand` |

### Regras

- As cores vêm dos tokens (`ink`, `ink-muted`, `brand`, `brand-strong`, `brand-deep`, `on-brand`).
  Não use hex solto.
- Não use `accent` (ciano) como cor de texto sobre fundo claro.
- Verde, âmbar e vermelho só para estados (acerto, atenção, erro), sempre com ícone.
- Contraste mínimo de 4.5:1 para texto (3:1 para texto grande) nos dois temas. Se um peso fino não passar, suba o peso.
- Landing: faixa completa de pesos. Dashboard e telas de estudo (quiz, flashcard, redação, chat): entre 400 e 800.
- No máximo 4 a 5 pesos diferentes na mesma tela.


## Logo

Versão 4B (bico sólido). Os SVGs oficiais vêm de `docs/redesign/Easy Education logo design.zip` (`svg/v4/*-B-*`).

Componente único: `Logo` em `src/components/brand/logo.tsx`.

| Prop | Valores |
|---|---|
| `variant` | `horizontal` (símbolo + "Easy Education", padrão) ou `symbol` |
| `size` | altura do símbolo: `xs` 16px, `sm` 19px, `md` 22px, `lg` 28px |
| `preload` | use no logo que aparece acima da dobra |

- Versão horizontal: o símbolo mais o texto "Easy Education" em Lexend 800, com espaçamento -0.02em,
  nas proporções da folha (texto com 92% da altura do símbolo e espaço de 33% entre os dois).
- Tema claro: símbolo azul (`simbolo-B-azul`) e texto `ink`.
- Tema escuro: símbolo branco (`simbolo-B-branco`) e texto `ink` claro.

| Arquivo | Uso |
|---|---|
| `public/brand/logo-simbolo-azul.svg` / `logo-simbolo-branco.svg` | símbolo nos temas claro e escuro |
| `src/app/icon.svg` (`icone-B-azul`) | favicon |
| `src/app/apple-icon.png` (180×180) | apple-touch-icon, gerado do `icone-B-azul` |
| `public/brand/icon-192.png` e `icon-512.png` | manifest (`src/app/manifest.ts`) |
| `src/app/opengraph-image.png` e `twitter-image.png` (1200×630) | compartilhamento: logo branco sobre `brand-deep` |
