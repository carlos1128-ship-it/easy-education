/**
 * Promoções e avisos exibidos no sininho de notificações.
 * Para publicar uma promoção, adicione um item com id único (mude o id para avisar de novo).
 * `until` é opcional (AAAA-MM-DD): depois dessa data o aviso some sozinho.
 */
export type Promotion = {
  id: string;
  title: string;
  body: string;
  href?: string;
  until?: string;
};

export const promotions: Promotion[] = [
  // Exemplo:
  // { id: "promo-volta-as-aulas", title: "Volta às aulas", body: "Plano Completo com desconto até domingo.", href: "/#planos", until: "2026-10-31" },
];
