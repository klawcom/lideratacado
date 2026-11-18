import { z } from "zod";

export const INFINITEPAY_API_BASE = "https://api.checkout.infinitepay.io";
export const INFINITEPAY_RETURN_URL = "https://lideratacado.app/pagamento/retorno";
export const INFINITEPAY_WEBHOOK_URL = "https://lideratacado.app/api/public/infinitepay/webhook";

export type InfinitePayConfig = { apiKey: string; handle: string };
export type PagamentoStatus = "pendente" | "processando" | "pago" | "falhou" | "cancelado" | "estornado" | "erro";

export const pagamentoStatusLabel = (status: string) =>
  ({
    pendente: "Aguardando pagamento",
    processando: "Gerando link",
    pago: "Pagamento confirmado",
    falhou: "Pagamento não aprovado",
    cancelado: "Cobrança cancelada",
    estornado: "Pagamento estornado",
    erro: "Erro na integração",
  })[status] ?? status;

export function normalizeInfiniteTag(value: string): string {
  return value.trim().replace(/^\$/, "");
}

export function reaisParaCentavos(value: number): number {
  if (!Number.isFinite(value) || value < 0) throw new Error("Valor de pagamento inválido.");
  return Math.round((value + Number.EPSILON) * 100);
}

function cleanDescription(value: string): string {
  const description = value.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!description) throw new Error("A descrição do item é obrigatória.");
  return description;
}

export type CobrancaInput = {
  handle: string;
  orderNsu: string;
  total: number;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  frete?: { description: string; price: number } | undefined;
  customer: { name: string; email: string; phoneNumber: string };
  address: { cep: string; street: string; number: string; neighborhood: string; city: string; state: string; complement?: string | undefined };
};

export function montarPayloadCobranca(input: CobrancaInput) {
  const handle = normalizeInfiniteTag(input.handle);
  if (!/^[a-zA-Z0-9_.-]{2,64}$/.test(handle)) throw new Error("InfiniteTag inválida.");
  if (!input.orderNsu.trim()) throw new Error("Pedido não identificado.");

  const items = input.items.map((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) throw new Error("Quantidade de pagamento inválida.");
    return {
      description: cleanDescription(item.description),
      quantity: item.quantity,
      price: reaisParaCentavos(item.unitPrice),
    };
  });
  if (input.frete && input.frete.price > 0) {
    items.push({ description: cleanDescription(`Frete — ${input.frete.description}`), quantity: 1, price: reaisParaCentavos(input.frete.price) });
  }
  if (items.length === 0 || items.some((item) => item.price <= 0)) throw new Error("A cobrança não possui itens válidos.");

  const amount = reaisParaCentavos(input.total);
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (amount <= 0 || amount !== itemsTotal) throw new Error("O total da cobrança não confere com os itens do pedido.");

  return {
    handle,
    items,
    order_nsu: input.orderNsu,
    redirect_url: INFINITEPAY_RETURN_URL,
    webhook_url: INFINITEPAY_WEBHOOK_URL,
    customer: {
      name: input.customer.name.trim().slice(0, 120),
      email: input.customer.email.trim().toLowerCase().slice(0, 255),
      phone_number: input.customer.phoneNumber,
    },
    address: {
      cep: input.address.cep,
      street: input.address.street,
      number: input.address.number,
      neighborhood: input.address.neighborhood,
      city: input.address.city,
      state: input.address.state,
      complement: input.address.complement || "",
    },
    options: {
      single_payment: true,
      payment_methods_enabled: ["credit_card", "pix"],
    },
  };
}

const providerUrl = z.string().url().max(2048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && (url.hostname === "infinitepay.io" || url.hostname.endsWith(".infinitepay.io"));
});

const checkoutLinkSchema = z.object({
  url: providerUrl.optional(),
  checkout_url: providerUrl.optional(),
  link: providerUrl.optional(),
  slug: z.string().trim().min(1).max(120).optional(),
});

export function extrairLinkCobranca(payload: unknown): { paymentUrl: string; invoiceSlug: string | null } {
  const parsed = checkoutLinkSchema.parse(payload);
  const paymentUrl = parsed.url ?? parsed.checkout_url ?? parsed.link;
  if (!paymentUrl) throw new Error("A InfinitePay não retornou o link de pagamento.");
  return { paymentUrl, invoiceSlug: parsed.slug ?? null };
}

export const paymentCheckResponseSchema = z.object({
  success: z.boolean(),
  paid: z.boolean().optional().default(false),
  amount: z.number().int().nonnegative().optional().default(0),
  paid_amount: z.number().int().nonnegative().optional(),
  installments: z.number().int().min(1).max(12).optional(),
  capture_method: z.enum(["pix", "credit_card"]).optional(),
});

export function pagamentoConfirmado(response: z.infer<typeof paymentCheckResponseSchema>, expectedAmount: number): boolean {
  return response.success && response.paid && response.amount === expectedAmount;
}

const webhookSchema = z.object({
  invoice_slug: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(120).optional(),
  transaction_nsu: z.string().trim().min(1).max(160),
  order_nsu: z.string().uuid(),
  receipt_url: providerUrl.optional(),
});

export function extrairDadosWebhook(payload: unknown) {
  const parsed = webhookSchema.parse(payload);
  const invoiceSlug = parsed.invoice_slug ?? parsed.slug;
  if (!invoiceSlug) throw new Error("Webhook sem código da fatura.");
  return {
    pedidoId: parsed.order_nsu,
    invoiceSlug,
    transactionNsu: parsed.transaction_nsu,
    receiptUrl: parsed.receipt_url,
  };
}
