import { describe, expect, it } from "vitest";
import {
  extrairDadosWebhook,
  extrairLinkCobranca,
  montarPayloadCobranca,
  pagamentoConfirmado,
  paymentCheckResponseSchema,
} from "./infinitepay";

const base = {
  handle: "$lider-atacado",
  orderNsu: "7d220c29-2b38-4ff3-8c6a-9ebd09f3e89b",
  total: 525.5,
  items: [{ description: "Camiseta Cotton Pima", quantity: 10, unitPrice: 46 }],
  frete: { description: "SEDEX (Correios)", price: 65.5 },
  customer: { name: "Cliente Teste", email: "TESTE@EXAMPLE.COM", phoneNumber: "+5566999999999" },
  address: { cep: "78000000", street: "Rua Teste", number: "10", neighborhood: "Centro", city: "Cuiabá", state: "MT" },
};

describe("InfinitePay checkout", () => {
  it("monta itens em centavos, inclui frete e habilita Pix e cartão em pagamento único", () => {
    const payload = montarPayloadCobranca(base);
    expect(payload.handle).toBe("lider-atacado");
    expect(payload.items).toEqual([
      { description: "Camiseta Cotton Pima", quantity: 10, price: 4600 },
      { description: "Frete — SEDEX (Correios)", quantity: 1, price: 6550 },
    ]);
    expect(payload.options).toEqual({ single_payment: true, payment_methods_enabled: ["credit_card", "pix"] });
    expect(payload.redirect_url).toBe("https://lideratacado.app/pagamento/retorno");
    expect(payload.webhook_url).toBe("https://lideratacado.app/api/public/infinitepay/webhook");
  });

  it("recusa cobrança quando o total difere dos itens", () => {
    expect(() => montarPayloadCobranca({ ...base, total: 500 })).toThrow("não confere");
  });

  it("aceita o campo url retornado pela API real", () => {
    expect(extrairLinkCobranca({ url: "https://checkout.infinitepay.io/pedido-7" })).toEqual({ paymentUrl: "https://checkout.infinitepay.io/pedido-7", invoiceSlug: null });
  });

  it("recusa links fora do domínio seguro da InfinitePay", () => {
    expect(() => extrairLinkCobranca({ url: "https://example.com/pagamento" })).toThrow();
    expect(() => extrairLinkCobranca({ url: "http://checkout.infinitepay.io/pagamento" })).toThrow();
  });

  it("preserva os formatos alternativos de resposta do link", () => {
    expect(extrairLinkCobranca({ checkout_url: "https://checkout.infinitepay.io/abc" }).paymentUrl).toBe("https://checkout.infinitepay.io/abc");
    expect(extrairLinkCobranca({ link: "https://checkout.infinitepay.io/def", slug: "fatura-1" })).toEqual({ paymentUrl: "https://checkout.infinitepay.io/def", invoiceSlug: "fatura-1" });
  });

  it("confirma somente paid true com o valor original exato", () => {
    const paid = paymentCheckResponseSchema.parse({ success: true, paid: true, amount: 52550, paid_amount: 52650, installments: 2, capture_method: "credit_card" });
    expect(pagamentoConfirmado(paid, 52550)).toBe(true);
    expect(pagamentoConfirmado(paid, 52549)).toBe(false);
    expect(pagamentoConfirmado({ ...paid, paid: false }, 52550)).toBe(false);
  });

  it("aceita paid_amount maior sem confundi-lo com o valor da cobrança", () => {
    const paid = paymentCheckResponseSchema.parse({ success: true, paid: true, amount: 1000, paid_amount: 1010 });
    expect(pagamentoConfirmado(paid, 1000)).toBe(true);
  });

  it("extrai os identificadores necessários do webhook", () => {
    expect(extrairDadosWebhook({
      invoice_slug: "abc123",
      transaction_nsu: "transacao-1",
      order_nsu: base.orderNsu,
      receipt_url: "https://checkout.infinitepay.io/recibo/1",
    })).toEqual({ pedidoId: base.orderNsu, invoiceSlug: "abc123", transactionNsu: "transacao-1", receiptUrl: "https://checkout.infinitepay.io/recibo/1" });
  });
});
