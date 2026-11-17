import { describe, expect, it } from "vitest";
import { linkWhatsapp, montarMensagemPedido } from "./whatsapp-message";

const base = {
  numero: 7,
  criadoEm: "2026-11-14T20:30:00Z",
  itens: [
    { nome: "Camiseta Pima Modelo 01", pecas: 10, preco: 29.9, valor: 299, qtd: { p: 5, m: 5, g: 0, gg: 0 }, observacao: "tons claros" },
    { nome: "Polo Piquet Modelo 01", pecas: 2, preco: 49.9, valor: 99.8, qtd: { p: 0, m: 0, g: 2, gg: 0 } },
  ],
  totalPecas: 12,
  faixa: 10,
  total: 398.8,
  cliente: { nome: "Ana Souza", email: "ana@exemplo.com", whatsapp: "66996444461" },
  entrega: { rua: "Rua A", numero: "10", complemento: "", bairro: "Centro", cidade: "Sinop", estado: "mt", cep: "78550000" },
  observacao: "",
};

describe("mensagem do pedido no WhatsApp", () => {
  const msg = montarMensagemPedido(base);
  it("número com 4 dígitos e data/hora", () => {
    expect(msg).toContain("🛍️ *NOVO PEDIDO #0007*");
    expect(msg).toContain("*Cliente: Ana Souza - 12 Peças*");
    expect(msg).toContain("📅 14/11/2026 às 16:30");
  });
  it("formata itens com cores e tamanhos específicos", () => {
    const comCores = montarMensagemPedido({
      ...base,
      itens: [
        {
          nome: "Camiseta Cotton Pima ARMN XCHNG",
          pecas: 9,
          preco: 45,
          valor: 405,
          qtd: { p: 1, m: 2, g: 4, gg: 2 },
          cores: [{ cor: "Branca", qtd: { p: 1, m: 2, g: 4, gg: 2 } }],
        },
      ],
    });
    expect(comCores).toContain("branca: 1-P, 2-M, 4-G, 2-GG");
    expect(comCores).toContain("⚠️ *Cores:* Conforme disponibilidade do estoque.");
    expect(comCores).toContain("confirmar com o cliente antes do envio");

    const comSortidas = montarMensagemPedido({
      ...base,
      substituicaoCores: "sortidas",
    });
    expect(comSortidas).toContain("Cliente autorizou envio de cores sortidas");
  });
  it("formata itens plus size com tamanhos G1 e G2", () => {
    const comPlusSize = montarMensagemPedido({
      ...base,
      itens: [
        {
          nome: "Camiseta Plus Size Básica",
          pecas: 5,
          preco: 49.9,
          valor: 249.5,
          qtd: { g1: 3, g2: 2 },
          cores: [{ cor: "Preta", qtd: { g1: 3, g2: 2 } }],
        },
      ],
    });
    expect(comPlusSize).toContain("preta: 3-G1, 2-G2");

    const semCores = montarMensagemPedido({
      ...base,
      itens: [
        {
          nome: "Camiseta Plus Size Básica",
          pecas: 5,
          preco: 49.9,
          valor: 249.5,
          qtd: { g1: 3, g2: 2 },
        },
      ],
    });
    expect(semCores).toContain("Tamanhos: G1 3 | G2 2");
  });
  it("omite tamanhos zerados, observação vazia e complemento vazio", () => {
    expect(msg).toContain("Tamanhos: P 5 | M 5");
    expect(msg).toContain("Tamanhos: G 2");
    expect(msg.match(/📝 Obs\./g)?.length).toBe(1);
    expect(msg).toContain("📍 Rua A, 10\n");
    expect(msg).not.toContain("Observação do pedido");
  });
  it("formata valores, telefone, UF e CEP", () => {
    expect(msg).toContain("10 peças (R$ 29,90 por peça)");
    expect(msg).toContain("*Total dos produtos: R$ 398,80*");
    expect(msg).toContain("📱 +55 (66) 99644-4461");
    expect(msg).toContain("Sinop/MT");
    expect(msg).toContain("CEP 78550-000");
  });
  it("inclui observação geral quando preenchida", () => {
    expect(montarMensagemPedido({ ...base, observacao: "Entregar à tarde" })).toContain("📝 *Observação do pedido:*\nEntregar à tarde");
  });
  it("inclui frete detalhado e total com frete quando selecionado", () => {
    const comFrete = montarMensagemPedido({
      ...base,
      total: 494.73, // 398.80 + 95.93
      cliente: { ...base.cliente, cpf: "12345678909" },
      frete: {
        servico: "PAC Correios",
        preco: 95.93,
        prazo: "Em até 8 dias úteis",
      },
    });
    expect(comFrete).toContain("Total dos produtos: R$ 398,80");
    expect(comFrete).toContain("📦 Frete (PAC Correios): R$ 95,93 (Em até 8 dias úteis)");
    expect(comFrete).toContain("*Total do pedido: R$ 494,73*");
    expect(comFrete).toContain("📄 CPF: 123.456.789-09");
    expect(comFrete).toContain("Aguardo a confirmação e as formas de pagamento. Obrigado!");
  });
  it("formata entrega no modelo dropshipping com revendedor e destinatário", () => {
    const comDrop = montarMensagemPedido({
      ...base,
      entrega: {
        rua: "Av. Paulista",
        numero: "1500",
        complemento: "Apto 42",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01310100",
        isDropshipping: true,
        destinatario: "Carlos Silva",
        cpfDestinatario: "11122233344",
        whatsappDestinatario: "11988887777",
      },
    });
    expect(comDrop).toContain("📦 *MODALIDADE: DROPSHIPPING*");
    expect(comDrop).toContain("*CLIENTE (REVENDEDOR)*");
    expect(comDrop).toContain("👤 Ana Souza");
    expect(comDrop).toContain("*ENTREGA (DESTINATÁRIO FINAL)*");
    expect(comDrop).toContain("👤 Destinatário: Carlos Silva");
    expect(comDrop).toContain("📄 CPF Destinatário: 111.222.333-44");
    expect(comDrop).toContain("📱 WhatsApp Destinatário: +55 (11) 98888-7777");
    expect(comDrop).toContain("📍 Av. Paulista, 1500 Apto 42");
    expect(comDrop).toContain("CEP 01310-100");
  });
  it("link wa.me mantém emojis e quebras de linha codificados", () => {
    const url = linkWhatsapp("5566996444461", msg);
    expect(url.startsWith("https://wa.me/5566996444461?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1]!)).toBe(msg);
  });
});
