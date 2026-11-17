import { beforeEach, describe, expect, it } from "vitest";
import { analytics, pushDataLayer } from "./analytics";

describe("analytics and dataLayer tracking", () => {
  beforeEach(() => {
    window.dataLayer = [];
  });

  it("pushes events to window.dataLayer", () => {
    pushDataLayer("custom_test_event", { foo: "bar" });
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer?.[0]).toEqual({
      event: "custom_test_event",
      foo: "bar",
    });
  });

  it("preserves the GTM queue when sending a commerce event", () => {
    const queue = [{ event: "gtm.js", "gtm.start": 123 }];
    window.dataLayer = queue;
    analytics.beginCheckout({
      total: 460,
      totalPecas: 10,
      itens: [{ id: "pima-04", nome: "Pima 04", pecas: 10, valor: 460 }],
    });
    expect(window.dataLayer).toBe(queue);
    expect(window.dataLayer?.[0]).toEqual({ event: "gtm.js", "gtm.start": 123 });
    expect(window.dataLayer?.[1]).toMatchObject({
      event: "begin_checkout",
      ecommerce: { currency: "BRL", value: 460 },
      total_pieces: 10,
    });
  });

  it("pushes view_item e-commerce event", () => {
    analytics.viewItem({
      id: "prod-1",
      nome: "Camiseta Pima",
      categoria: "Camisetas",
      precoMin: 45,
    });
    const first = window.dataLayer?.[0] as Record<string, any>;
    expect(first?.["event"]).toBe("view_item");
    const ecom = first?.["ecommerce"] as any;
    expect(ecom.currency).toBe("BRL");
    expect(ecom.items[0].item_name).toBe("Camiseta Pima");
  });

  it("pushes add_to_cart e-commerce event", () => {
    analytics.addToCart({
      id: "prod-1",
      nome: "Camiseta Pima",
      precoUnitario: 45,
      pecasTotal: 10,
      valorTotal: 450,
      cores: [{ cor: "Branca", pecas: 10 }],
    });
    const first = window.dataLayer?.[0] as Record<string, any>;
    expect(first?.["event"]).toBe("add_to_cart");
    const ecom = first?.["ecommerce"] as any;
    expect(ecom.value).toBe(450);
  });

  it("pushes purchase event with real order number", () => {
    analytics.purchase({
      numero: 1024,
      total: 550,
      frete: 50,
      totalPecas: 12,
      itens: [{ nome: "Polo Piquet", pecas: 12, valor: 500 }],
    });
    const first = window.dataLayer?.[0] as Record<string, any>;
    expect(first?.["event"]).toBe("purchase");
    const ecom = first?.["ecommerce"] as any;
    expect(ecom.transaction_id).toBe("1024");
    expect(ecom.value).toBe(550);
  });
});
