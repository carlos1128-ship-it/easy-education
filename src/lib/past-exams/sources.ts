// Links checked against the institution's annual/archive page on 2026-10-12.
// None of these entries grants reproduction or commercial-use rights.
export const EXAM_SOURCES = [
  {
    slug: "enem",
    name: "ENEM",
    archiveUrl:
      "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025",
    sourceNotes:
      "2025: cadernos por dia, cor, aplicação e atendimento. Separar língua estrangeira. Licença por documento pendente.",
  },
  {
    slug: "fuvest",
    name: "FUVEST",
    archiveUrl: "https://www.fuvest.br/acervo-vestibular-2025/",
    sourceNotes:
      "2025: quatro versões da primeira fase e correspondência de gabaritos. Reprodução não autorizada neste cadastro.",
  },
  {
    slug: "unesp",
    name: "UNESP",
    archiveUrl: "https://www.vunesp.com.br/VNSP2404/",
    sourceNotes:
      "Vestibular 2025. Provas e Gabaritos redireciona para login da Vunesp. Não contornar autenticação. Links públicos alternativos exigem validação da versão e procedência.",
  },
  {
    slug: "unicamp",
    name: "UNICAMP",
    archiveUrl: "https://www.comvest.unicamp.br/ingresso-2025/vestibular-2025/",
    sourceNotes:
      "2025: provas Q/Z, R/W, S/X, T/Y e gabaritos finais. Segunda fase por área. Portal declara todos os direitos reservados; autorização pendente.",
  },
  {
    slug: "ita",
    name: "ITA",
    archiveUrl: "https://vestibular.ita.br/provas.htm",
    sourceNotes:
      "Acervo por ano e fase. 2025 inclui primeira fase e disciplinas da segunda. Licença pendente.",
  },
  {
    slug: "uea",
    name: "UEA",
    archiveUrl: "https://www.vunesp.com.br/UEAM2501",
    sourceNotes:
      "Concurso 2025, acesso 2026. Provas e gabaritos no processo específico da organizadora; não confundir com SIS.",
  },
  {
    slug: "uece",
    name: "UECE",
    archiveUrl: "https://www.cev.uece.br/vestibular-2025-1/",
    sourceNotes:
      "Processo 2025.1. Conferir comunicados de gabaritos definitivos e retificações por fase.",
  },
  {
    slug: "uema",
    name: "UEMA",
    archiveUrl:
      "https://www.paes.uema.br/2016/05/23/provas-dos-paes-anteriores/",
    sourceNotes:
      "Acervo oficial histórico PAES, inclui arquivo RAR 2018. Não baixar/replicar antes de autorização; cadastrar fontes individuais após conferência.",
  },
  {
    slug: "uerj",
    name: "UERJ",
    archiveUrl: "https://www.revista.vestibular.uerj.br/questao/",
    sourceNotes:
      "Revista oficial: arquivos por ano, exames de qualificação e discursivo, com comentários das bancas. Reprodução dos comentários também exige licença.",
  },
  {
    slug: "ufpr",
    name: "UFPR",
    archiveUrl: "https://servicos.nc.ufpr.br/PortalNC/Concurso?concurso=PS2025",
    sourceNotes:
      "Processo Seletivo UFPR 2025. Separar publicações provisórias das definitivas.",
  },
  {
    slug: "ufrgs",
    name: "UFRGS",
    archiveUrl: "https://www.ufrgs.br/coperse/concurso-vestibular-2025/",
    sourceNotes:
      "Redirecionamento oficial do endereço vestibular.ufrgs.br/cv2025. Provas e aquisição via COPERSE. Direitos pendentes.",
  },
  {
    slug: "unb",
    name: "UnB",
    archiveUrl: "https://www.cebraspe.org.br/vestibulares/VESTUNB_25",
    sourceNotes:
      "Vestibular 2025. Provas com itens de tipos diferentes. O módulo informa acurácia de treino, não pontuação oficial CEBRASPE com penalidades.",
  },
  {
    slug: "ime",
    name: "IME",
    archiveUrl:
      "https://www.ime.eb.mil.br/vestibular-e-concursos/cfg-ensino-medio/provas-anteriores-cfg",
    sourceNotes:
      "Acervo CFG por ano: objetiva e segunda fase por disciplina. Não confundir com CG/CFrm.",
  },
];
export const PRIORITY_BOOKLETS = [
  {
    slug: "unesp",
    year: 2025,
    title: "UNESP 2025 · 1ª fase",
    phase: "1ª fase",
    booklet: "Versão a conferir",
    day: "",
    language: "",
    questionCount: 90,
    durationMinutes: 300,
    format: "mcq5" as const,
    sourceUrl:
      "https://s5.static.brasilescola.uol.com.br/vestibular/2024/11/prova-primeira-fase-da-unesp-2025.pdf",
    keyUrl:
      "https://www2.curso-objetivo.br/vestibular/resolucao-comentada/unesp/2025/1fase/UNESP2025_1fase_gabarito.pdf",
  },
  {
    slug: "enem",
    year: 2025,
    title: "ENEM 2025 · 1º dia · Azul · Inglês",
    phase: "Aplicação regular",
    booklet: "Caderno 1 · Azul",
    day: "1º dia",
    language: "Inglês",
    questionCount: 90,
    durationMinutes: 330,
    format: "mcq5" as const,
    sourceUrl:
      "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_PV_impresso_D1_CD1.pdf",
    keyUrl:
      "https://download.inep.gov.br/enem/provas_e_gabaritos/2025_GB_impresso_D1_CD1.pdf",
  },
  {
    slug: "fuvest",
    year: 2025,
    title: "FUVEST 2025 · 1ª fase · V1",
    phase: "1ª fase",
    booklet: "V1",
    day: "",
    language: "",
    questionCount: 90,
    durationMinutes: 300,
    format: "mcq5" as const,
    sourceUrl:
      "https://www.fuvest.br/wp-content/uploads/fuvest2025_primeira_fase_prova_V1.pdf",
    keyUrl:
      "https://www.fuvest.br/wp-content/uploads/fuvest2025_gabarito_primeira_fase.pdf",
  },
  {
    slug: "unicamp",
    year: 2025,
    title: "UNICAMP 2025 · 1ª fase · Q",
    phase: "1ª fase",
    booklet: "Q (arquivo Q/Z)",
    day: "",
    language: "",
    questionCount: 72,
    durationMinutes: 300,
    format: "mcq4" as const,
    sourceUrl: "https://www.comvest.unicamp.br/vest2025/F1/f12025Q_Z.pdf",
    keyUrl:
      "https://www.comvest.unicamp.br/wp-content/uploads/2024/10/QZ_gabarito_2025_FINAL_site.pdf",
  },
  {
    slug: "ita",
    year: 2025,
    title: "ITA 2025 · 1ª fase",
    phase: "1ª fase",
    booklet: "Único",
    day: "",
    language: "",
    questionCount: 48,
    durationMinutes: 300,
    format: "mcq5" as const,
    sourceUrl: "https://vestibular.ita.br/provas/2025_fase1.pdf",
    keyUrl: "https://vestibular.ita.br/provas/gabarito_2025.pdf",
  },
];
