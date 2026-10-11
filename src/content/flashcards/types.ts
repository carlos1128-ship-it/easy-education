/**
 * Baralhos prontos de flashcards (sem IA). Conteúdo escrito para o app, no nível do Ensino Médio/ENEM
 * (alguns servem ao Fundamental II). O aluno adiciona o baralho com um clique e revisa com repetição espaçada;
 * também são a reserva quando o limite de flashcards por IA acaba.
 */
export type ReadyCard = { front: string; back: string };

export type ReadyDeck = {
  /** Identificador estável (não mude depois de publicado: é como o app sabe se o aluno já adicionou). */
  slug: string;
  /** Matéria do banco (mesmos slugs de SEED_SUBJECTS). */
  subjectSlug: string;
  /** Nome da matéria como aparece no app. */
  subject: string;
  topic: string;
  /** Palavras que ajudam a achar o baralho pelo tema que o aluno digita. */
  keywords: string[];
  cards: ReadyCard[];
};
