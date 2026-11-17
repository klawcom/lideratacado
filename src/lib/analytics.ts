declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_category?: string | undefined;
  price?: number | undefined;
  quantity?: number | undefined;
  item_variant?: string | undefined;
};

export function pushDataLayer(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    ...payload,
  });

  if (typeof window.gtag === "function") {
    try {
      window.gtag("event", event, payload);
    } catch {
      /* ignore gtag error if blocked by adblock */
    }
  }
}

export const analytics = {
  /** Visualização detalhada de produto */
  viewItem(product: {
    id: string;
    nome: string;
    categoria?: string | undefined;
    precoMin?: number | null | undefined;
  }) {
    pushDataLayer("view_item", {
      ecommerce: {
        currency: "BRL",
        value: product.precoMin ?? undefined,
        items: [
          {
            item_id: product.id,
            item_name: product.nome,
            item_category: product.categoria,
            price: product.precoMin ?? undefined,
          },
        ],
      },
    });
  },

  /** Seleção de variante (cor e tamanho) */
  selectVariant(variant: {
    id: string;
    nome: string;
    cor: string;
    tamanho: string;
    quantidade: number;
  }) {
    pushDataLayer("select_item_variant", {
      item_id: variant.id,
      item_name: variant.nome,
      color: variant.cor,
      size: variant.tamanho,
      quantity: variant.quantidade,
    });
  },

  /** Adição de produto ao carrinho */
  addToCart(item: {
    id: string;
    nome: string;
    precoUnitario: number;
    pecasTotal: number;
    valorTotal: number;
    cores?: Array<{ cor: string; pecas: number }> | undefined;
  }) {
    pushDataLayer("add_to_cart", {
      ecommerce: {
        currency: "BRL",
        value: item.valorTotal,
        items: [
          {
            item_id: item.id,
            item_name: item.nome,
            price: item.precoUnitario,
            quantity: item.pecasTotal,
          },
        ],
      },
      product_colors: item.cores,
    });
  },

  /** Remoção de produto do carrinho */
  removeFromCart(item: {
    id: string;
    nome: string;
    precoUnitario: number;
    pecasTotal: number;
    valorTotal: number;
  }) {
    pushDataLayer("remove_from_cart", {
      ecommerce: {
        currency: "BRL",
        value: item.valorTotal,
        items: [
          {
            item_id: item.id,
            item_name: item.nome,
            price: item.precoUnitario,
            quantity: item.pecasTotal,
          },
        ],
      },
    });
  },

  /** Início da etapa de finalização / checkout */
  beginCheckout(order: {
    total: number;
    totalPecas: number;
    itens: Array<{ id: string; nome: string; pecas: number; valor: number }>;
  }) {
    pushDataLayer("begin_checkout", {
      ecommerce: {
        currency: "BRL",
        value: order.total,
        items: order.itens.map((i) => ({
          item_id: i.id,
          item_name: i.nome,
          quantity: i.pecas,
          price: i.pecas > 0 ? order.total / order.totalPecas : 0,
        })),
      },
      total_pieces: order.totalPecas,
    });
  },

  /** Clique para atendimento ou envio de pedido via WhatsApp */
  clickWhatsApp(
    origem: "header" | "footer" | "produto" | "finalizar" | "suporte" | "confirmado",
    detalhes?: Record<string, unknown> | undefined
  ) {
    pushDataLayer("contact_whatsapp", {
      channel: "whatsapp",
      origin: origem,
      ...detalhes,
    });
  },

  /** Pedido concluído com sucesso e registrado no sistema */
  purchase(order: {
    numero: number;
    total: number;
    frete?: number | undefined;
    totalPecas: number;
    itens: Array<{ nome: string; pecas: number; valor: number }>;
  }) {
    pushDataLayer("purchase", {
      ecommerce: {
        transaction_id: String(order.numero),
        value: order.total,
        shipping: order.frete || 0,
        currency: "BRL",
        items: order.itens.map((i) => ({
          item_name: i.nome,
          quantity: i.pecas,
          price: i.pecas > 0 ? i.valor / i.pecas : i.valor,
        })),
      },
      total_pieces: order.totalPecas,
    });
  },
};
