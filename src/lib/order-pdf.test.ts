import { describe, expect, it } from "vitest";
import { gerarHtmlPedidoPdf, type PedidoPDFData } from "./order-pdf";

const mockPedido: PedidoPDFData = {
  numero: 123,
  criadoEm: "2026-11-15T20:00:00Z",
  statusLabel: "Aguardando Pagamento",
  cliente: {
    nome: "João Revendedor",
    email: "joao@email.com",
    whatsapp: "66999998888",
    cpf: "12345678900",
  },
  entrega: {
    rua: "Rua das Palmeiras",
    numero: "500",
    bairro: "Jardim das Oliveiras",
    cidade: "Sinop",
    estado: "MT",
    cep: "78550000",
  },
  itens: [
    {
      nome: "Camiseta Cotton Pima",
      codigo: "PIMA-01",
      pecas: 10,
      preco: 35,
      valor: 350,
      detalhes: "Preta: 5-M, 5-G",
    },
  ],
  resumo: {
    totalPecas: 10,
    faixa: 10,
    total: 380,
  },
  frete: {
    servico: "PAC Correios",
    preco: 30,
    prazo: "5 dias úteis",
  },
  observacao: "Entregar em horário comercial",
};

describe("Geração de HTML para PDF do Pedido", () => {
  it("gera cabeçalho e dados do cliente e entrega corretamente", () => {
    const html = gerarHtmlPedidoPdf(mockPedido);
    expect(html).toContain("PEDIDO #0123");
    expect(html).toContain("João Revendedor");
    expect(html).toContain("123.456.789-00");
    expect(html).toContain("Rua das Palmeiras, 500");
    expect(html).toContain("Sinop/MT");
    expect(html).toContain("78550-000");
    expect(html).toContain("Camiseta Cotton Pima");
    expect(html).toContain("PIMA-01");
    expect(html).toContain("Preta: 5-M, 5-G");
    expect(html).toContain("PAC Correios");
    expect(html).toContain("R$ 380,00");
    expect(html).toContain("Entregar em horário comercial");
  });

  it("destaca formato dropshipping quando ativo", () => {
    const dropPedido: PedidoPDFData = {
      ...mockPedido,
      entrega: {
        ...mockPedido.entrega,
        isDropshipping: true,
        destinatario: "Maria Cliente Final",
        cpfDestinatario: "98765432100",
        whatsappDestinatario: "11977776666",
      },
    };
    const html = gerarHtmlPedidoPdf(dropPedido);
    expect(html).toContain("DROPSHIPPING");
    expect(html).toContain("Destinatário:</strong> Maria Cliente Final");
    expect(html).toContain("987.654.321-00");
    expect(html).toContain("+55 (11) 97777-6666");
  });
});
