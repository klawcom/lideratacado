import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  enviarEmailNovoPedido,
  gerarHtmlEmailPedido,
  gerarTextoEmailPedido,
  type DadosEmailPedido,
} from "./order-email";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  },
}));

const mockPedido: DadosEmailPedido = {
  numero: 1042,
  criadoEm: "2026-11-22T14:30:00Z",
  formaPagamento: "whatsapp",
  total: 450.0,
  totalPecas: 10,
  faixa: 10,
  frete: {
    servico: "SEDEX (Correios)",
    preco: 30.0,
    prazo: "3 dias úteis",
  },
  cliente: {
    nome: "João da Silva",
    email: "joao@exemplo.com",
    whatsapp: "5511999998888",
    cpf: "12345678901",
  },
  entrega: {
    rua: "Rua das Flores",
    numero: "123",
    complemento: "Apto 4",
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP",
    cep: "01001000",
  },
  itens: [
    {
      nome: "Camiseta Cotton Pima",
      codigo: "PIMA-01",
      pecas: 10,
      preco: 42.0,
      valor: 420.0,
      qtd: { p: 2, m: 4, g: 4, gg: 0, g1: 0, g2: 0 },
      cores: [
        { cor: "Preta", qtd: { p: 1, m: 2, g: 2, gg: 0, g1: 0, g2: 0 } },
        { cor: "Branca", qtd: { p: 1, m: 2, g: 2, gg: 0, g1: 0, g2: 0 } },
      ],
      observacao: "Embalar com cuidado",
    },
  ],
  observacao: "Favor enviar código de rastreio",
  emailLoja: "lojista@lideratacado.com.br",
};

describe("order-email module", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
    vi.restoreAllMocks();
  });

  it("gerarHtmlEmailPedido gera HTML completo e formatado", () => {
    const html = gerarHtmlEmailPedido(mockPedido);
    expect(html).toContain("PEDIDO #1042");
    expect(html).toContain("João da Silva");
    expect(html).toContain("https://wa.me/5511999998888");
    expect(html).toContain("Camiseta Cotton Pima");
    expect(html).toContain("PIMA-01");
    expect(html).toContain("preta");
    expect(html).toContain("branca");
    expect(html).toContain("SEDEX (Correios)");
    expect(html).toContain("R$ 450,00");
    expect(html).toContain("Favor enviar código de rastreio");
  });

  it("gerarTextoEmailPedido gera texto puro equivalente", () => {
    const text = gerarTextoEmailPedido(mockPedido);
    expect(text).toContain("Pedido: #1042");
    expect(text).toContain("João da Silva");
    expect(text).toContain("https://wa.me/5511999998888");
    expect(text).toContain("Camiseta Cotton Pima");
    expect(text).toContain("VALOR TOTAL: R$ 450,00");
  });

  it("enviarEmailNovoPedido retorna falha sem erro fatal se RESEND_API_KEY não estiver configurada", async () => {
    delete process.env["RESEND_API_KEY"];
    const res = await enviarEmailNovoPedido(mockPedido);
    expect(res.success).toBe(false);
    expect(res.error).toBe("RESEND_API_KEY_NOT_CONFIGURED");
  });

  it("enviarEmailNovoPedido faz chamada POST para Resend quando configurada", async () => {
    process.env["RESEND_API_KEY"] = "re_test_123456";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email_id_abc123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await enviarEmailNovoPedido(mockPedido);

    expect(res.success).toBe(true);
    expect(res.id).toBe("email_id_abc123");
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer re_test_123456",
        "Content-Type": "application/json",
      }),
    }));
  });

  it("enviarEmailNovoPedido aceita apiKey passada diretamente nos dados", async () => {
    delete process.env["RESEND_API_KEY"];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email_custom_key_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await enviarEmailNovoPedido({
      ...mockPedido,
      apiKey: "re_custom_from_db",
    });

    expect(res.success).toBe(true);
    expect(res.id).toBe("email_custom_key_123");
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: "Bearer re_custom_from_db",
      }),
    }));
  });
});
