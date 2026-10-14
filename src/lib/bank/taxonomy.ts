/**
 * Árvore de conteúdo do banco de questões: matéria → unidade → tópico.
 *
 * Escrita pela equipe a partir da matriz de referência do ENEM (conteúdos que caem na prova).
 * É a fonte da verdade: `scripts/bank/sync-taxonomy.ts` grava no banco e
 * `scripts/bank/classify-topics.ts` encaixa cada questão em um destes tópicos (lista fechada).
 * Os slugs das matérias são os que já existem em `bank_subjects`.
 */

export type TaxonomyUnit = { name: string; topics: string[] };
export type TaxonomySubject = { slug: string; units: TaxonomyUnit[] };

export const TAXONOMY: TaxonomySubject[] = [
  {
    slug: "matematica",
    units: [
      { name: "Aritmética", topics: ["Operações e expressões numéricas", "Múltiplos, divisores e MMC/MDC", "Frações e números decimais", "Potências e raízes", "Notação científica"] },
      { name: "Razão, proporção e porcentagem", topics: ["Razão e proporção", "Regra de três", "Porcentagem", "Juros simples e compostos"] },
      { name: "Grandezas e medidas", topics: ["Unidades de medida e conversões", "Escalas", "Velocidade, vazão e densidade", "Tempo e calendário"] },
      { name: "Álgebra", topics: ["Equações e inequações do 1º grau", "Equações do 2º grau", "Sistemas de equações", "Sequências e progressões (PA e PG)", "Logaritmos e exponenciais"] },
      { name: "Funções", topics: ["Leitura de gráficos", "Função afim", "Função quadrática", "Função exponencial e logarítmica", "Funções trigonométricas"] },
      { name: "Geometria plana", topics: ["Ângulos e polígonos", "Triângulos e semelhança", "Teorema de Pitágoras e relações métricas", "Áreas e perímetros", "Circunferência e círculo", "Trigonometria no triângulo retângulo"] },
      { name: "Geometria espacial", topics: ["Prismas e cilindros", "Pirâmides e cones", "Esfera", "Volume e capacidade", "Planificações e vistas"] },
      { name: "Geometria analítica", topics: ["Plano cartesiano e distância", "Equação da reta", "Circunferência no plano cartesiano"] },
      { name: "Estatística", topics: ["Tabelas e gráficos estatísticos", "Média, moda e mediana", "Desvio padrão e dispersão"] },
      { name: "Contagem e probabilidade", topics: ["Princípio fundamental da contagem", "Arranjo, permutação e combinação", "Probabilidade"] },
    ],
  },
  {
    slug: "fisica",
    units: [
      { name: "Cinemática", topics: ["Movimento uniforme", "Movimento uniformemente variado", "Queda livre e lançamentos", "Movimento circular"] },
      { name: "Dinâmica", topics: ["Leis de Newton", "Atrito e plano inclinado", "Trabalho, potência e energia", "Conservação da energia", "Quantidade de movimento e colisões", "Gravitação"] },
      { name: "Estática e hidrostática", topics: ["Equilíbrio e alavancas", "Pressão e densidade", "Empuxo e princípio de Pascal"] },
      { name: "Termologia", topics: ["Temperatura e dilatação", "Calor e calorimetria", "Mudanças de estado", "Transmissão de calor", "Termodinâmica e máquinas térmicas"] },
      { name: "Ondulatória", topics: ["Ondas e suas propriedades", "Acústica", "Espectro eletromagnético"] },
      { name: "Óptica", topics: ["Reflexão e espelhos", "Refração e lentes", "Visão e instrumentos ópticos"] },
      { name: "Eletricidade", topics: ["Eletrostática", "Corrente, resistência e Lei de Ohm", "Circuitos elétricos", "Potência e consumo de energia elétrica"] },
      { name: "Magnetismo e energia", topics: ["Campo magnético e eletroímãs", "Indução eletromagnética e geradores", "Fontes e geração de energia"] },
      { name: "Física moderna", topics: ["Efeito fotoelétrico e física quântica", "Radioatividade e física nuclear"] },
    ],
  },
  {
    slug: "quimica",
    units: [
      { name: "Matéria e separação de misturas", topics: ["Propriedades e estados da matéria", "Substâncias e misturas", "Separação de misturas"] },
      { name: "Atomística e tabela periódica", topics: ["Modelos atômicos", "Estrutura do átomo e distribuição eletrônica", "Tabela periódica e propriedades periódicas", "Elementos químicos e suas aplicações"] },
      { name: "Ligações e funções inorgânicas", topics: ["Ligações químicas", "Polaridade e forças intermoleculares", "Ácidos e bases", "Sais e óxidos"] },
      { name: "Reações e estequiometria", topics: ["Reações químicas e balanceamento", "Mol e massa molar", "Estequiometria"] },
      { name: "Soluções", topics: ["Concentração das soluções", "Diluição e mistura de soluções", "Propriedades coligativas"] },
      { name: "Físico-química", topics: ["Termoquímica", "Cinética química", "Equilíbrio químico", "pH e pOH", "Eletroquímica: pilhas e eletrólise"] },
      { name: "Química orgânica", topics: ["Cadeias carbônicas e hidrocarbonetos", "Funções orgânicas", "Isomeria", "Reações orgânicas", "Polímeros"] },
      { name: "Química ambiental e do cotidiano", topics: ["Poluição e tratamento de água", "Combustíveis e energia", "Radioatividade", "Química dos alimentos e medicamentos"] },
    ],
  },
  {
    slug: "biologia",
    units: [
      { name: "Bioquímica", topics: ["Água e sais minerais", "Carboidratos", "Lipídios e vitaminas", "Proteínas e enzimas", "Ácidos nucleicos"] },
      { name: "Citologia", topics: ["Célula e organelas", "Membrana e transporte", "Respiração celular e fermentação", "Fotossíntese", "Divisão celular"] },
      { name: "Genética", topics: ["Leis de Mendel", "Herança e heredogramas", "Grupos sanguíneos", "Biotecnologia e engenharia genética", "Mutações"] },
      { name: "Evolução", topics: ["Teorias evolutivas", "Seleção natural e especiação", "Origem da vida"] },
      { name: "Ecologia", topics: ["Cadeias e teias alimentares", "Relações ecológicas", "Ciclos biogeoquímicos", "Biomas e ecossistemas", "Impactos ambientais e sustentabilidade"] },
      { name: "Fisiologia humana", topics: ["Digestão e nutrição", "Circulação e respiração", "Excreção", "Sistema nervoso e endócrino", "Sistema imunitário e vacinas", "Reprodução humana e métodos contraceptivos"] },
      { name: "Seres vivos", topics: ["Vírus e bactérias", "Protozoários e fungos", "Botânica", "Zoologia", "Doenças e parasitoses"] },
      { name: "Histologia e embriologia", topics: ["Tecidos do corpo humano", "Desenvolvimento embrionário"] },
    ],
  },
  {
    slug: "historia",
    units: [
      { name: "Antiguidade e Idade Média", topics: ["Pré-história e primeiras civilizações", "Grécia e Roma", "Feudalismo e Igreja medieval"] },
      { name: "Idade Moderna", topics: ["Renascimento e Reformas religiosas", "Absolutismo e mercantilismo", "Grandes navegações", "Iluminismo"] },
      { name: "Brasil Colônia", topics: ["Colonização e economia açucareira", "Escravidão e resistência", "Mineração", "Revoltas coloniais"] },
      { name: "Brasil Império", topics: ["Independência do Brasil", "Primeiro Reinado e Regências", "Segundo Reinado", "Abolição da escravidão"] },
      { name: "Brasil República", topics: ["Primeira República", "Era Vargas", "República de 1946 a 1964", "Ditadura militar", "Redemocratização e Constituição de 1988"] },
      { name: "Idade Contemporânea", topics: ["Revoluções Francesa e Industrial", "Imperialismo", "Primeira Guerra e Revolução Russa", "Totalitarismos e Segunda Guerra", "Guerra Fria", "Descolonização da África e da Ásia"] },
      { name: "América e cidadania", topics: ["Povos indígenas e América pré-colombiana", "Independências na América", "Movimentos sociais e direitos humanos", "Patrimônio, memória e cultura afro-brasileira"] },
    ],
  },
  {
    slug: "geografia",
    units: [
      { name: "Cartografia", topics: ["Escala e coordenadas geográficas", "Projeções e leitura de mapas", "Fusos horários"] },
      { name: "Geografia física", topics: ["Estrutura da Terra e relevo", "Solos e erosão", "Clima e fenômenos atmosféricos", "Hidrografia", "Vegetação e domínios morfoclimáticos"] },
      { name: "Questão ambiental", topics: ["Mudanças climáticas", "Desmatamento e conservação", "Recursos hídricos", "Conferências e políticas ambientais"] },
      { name: "População e urbanização", topics: ["Demografia e pirâmides etárias", "Migrações", "Urbanização e problemas urbanos", "Metropolização"] },
      { name: "Espaço agrário e indústria", topics: ["Agropecuária e agronegócio", "Questão agrária no Brasil", "Industrialização", "Fontes de energia"] },
      { name: "Geopolítica e globalização", topics: ["Globalização e fluxos", "Blocos econômicos", "Conflitos e territórios", "Ordem mundial"] },
      { name: "Geografia do Brasil", topics: ["Regionalização do Brasil", "Transportes e circulação", "Desigualdades regionais"] },
    ],
  },
  {
    slug: "filosofia",
    units: [
      { name: "Filosofia antiga", topics: ["Pré-socráticos", "Sócrates e Platão", "Aristóteles", "Filosofia helenística"] },
      { name: "Filosofia medieval e moderna", topics: ["Agostinho e Tomás de Aquino", "Racionalismo e empirismo", "Kant", "Contratualistas: Hobbes, Locke e Rousseau"] },
      { name: "Filosofia contemporânea", topics: ["Marx e a crítica social", "Nietzsche", "Existencialismo", "Escola de Frankfurt e indústria cultural"] },
      { name: "Temas", topics: ["Ética e moral", "Política e poder", "Teoria do conhecimento", "Ciência e tecnologia"] },
    ],
  },
  {
    slug: "sociologia",
    units: [
      { name: "Clássicos da sociologia", topics: ["Durkheim", "Weber", "Marx e as classes sociais"] },
      { name: "Sociedade e cultura", topics: ["Cultura, identidade e etnocentrismo", "Diversidade e preconceito", "Gênero e sexualidade", "Indústria cultural e meios de comunicação"] },
      { name: "Trabalho e desigualdade", topics: ["Mundo do trabalho", "Desigualdade social", "Movimentos sociais"] },
      { name: "Política e cidadania", topics: ["Estado, poder e democracia", "Cidadania e direitos", "Violência e segurança"] },
    ],
  },
  {
    slug: "lingua-portuguesa",
    units: [
      { name: "Interpretação de texto", topics: ["Tema e ideia central", "Inferência e informações implícitas", "Intertextualidade", "Argumentação e opinião"] },
      { name: "Gêneros e linguagem", topics: ["Gêneros textuais", "Funções da linguagem", "Variação linguística", "Linguagem verbal e não verbal"] },
      { name: "Gramática", topics: ["Classes de palavras", "Sintaxe e concordância", "Coesão e coerência", "Pontuação", "Semântica e figuras de linguagem"] },
    ],
  },
  {
    slug: "literatura",
    units: [
      { name: "Teoria literária", topics: ["Gêneros literários", "Figuras de linguagem na literatura", "Poesia e versificação"] },
      { name: "Escolas literárias", topics: ["Quinhentismo e Barroco", "Arcadismo", "Romantismo", "Realismo e Naturalismo", "Parnasianismo e Simbolismo", "Pré-Modernismo", "Modernismo", "Literatura contemporânea"] },
    ],
  },
  {
    slug: "artes",
    units: [
      { name: "Artes", topics: ["Artes visuais e movimentos artísticos", "Arte brasileira e cultura popular", "Música, dança e teatro", "Arte contemporânea e patrimônio"] },
    ],
  },
  {
    slug: "educacao-fisica",
    units: [{ name: "Corpo e movimento", topics: ["Esportes e jogos", "Saúde, corpo e atividade física", "Danças e práticas corporais"] }],
  },
  {
    slug: "tecnologias-da-informacao",
    units: [{ name: "Tecnologias e comunicação", topics: ["Internet e redes sociais", "Tecnologia e sociedade", "Linguagem digital e mídias"] }],
  },
  {
    slug: "ingles",
    units: [{ name: "Leitura em inglês", topics: ["Compreensão de texto em inglês", "Vocabulário e expressões em inglês"] }],
  },
  {
    slug: "espanhol",
    units: [{ name: "Leitura em espanhol", topics: ["Compreensão de texto em espanhol", "Vocabulário e expressões em espanhol"] }],
  },
];

/** Slug sem acento, em minúsculas e com hífens (mesma regra para unidade e tópico). */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lista plana de tópicos de uma matéria, com a unidade, para a classificação (lista fechada). */
export function topicsOf(subjectSlug: string) {
  const subject = TAXONOMY.find((item) => item.slug === subjectSlug);
  return (subject?.units ?? []).flatMap((unit, unitIndex) =>
    unit.topics.map((topic, topicIndex) => ({ unit: unit.name, unitSlug: slugify(unit.name), unitIndex, topic, topicSlug: slugify(topic), topicIndex })),
  );
}
