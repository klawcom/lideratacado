import { describe, it, expect } from "vitest";

describe("Cálculos de Desconto Promocional", () => {
  function calcularPrecoComDesconto(
    precoOriginal: number,
    tipo: "porcentagem" | "fixo",
    valor: number
  ): number {
    if (tipo === "porcentagem") {
      const mult = Math.max(0, 1 - valor / 100);
      return Math.max(1, Math.round(precoOriginal * mult * 100) / 100);
    } else {
      return Math.max(1, Math.round((precoOriginal - valor) * 100) / 100);
    }
  }

  it("calcula desconto percentual corretamente", () => {
    // 10% sobre 46,00 = 41,40
    expect(calcularPrecoComDesconto(46, "porcentagem", 10)).toBe(41.4);
    // 15% sobre 52,00 = 44,20
    expect(calcularPrecoComDesconto(52, "porcentagem", 15)).toBe(44.2);
    // 5% sobre 42,00 = 39,90
    expect(calcularPrecoComDesconto(42, "porcentagem", 5)).toBe(39.9);
  });

  it("calcula desconto em valor fixo (R$) corretamente", () => {
    // R$ 3,00 de desconto sobre 46,00 = 43,00
    expect(calcularPrecoComDesconto(46, "fixo", 3)).toBe(43);
    // R$ 5,00 de desconto sobre 50,00 = 45,00
    expect(calcularPrecoComDesconto(50, "fixo", 5)).toBe(45);
  });

  it("garante piso mínimo de R$ 1,00 para evitar preços negativos ou zerados", () => {
    expect(calcularPrecoComDesconto(10, "fixo", 20)).toBe(1);
    expect(calcularPrecoComDesconto(10, "porcentagem", 100)).toBe(1);
  });
});

describe("Filtro de Selo Promocional por Produto", () => {
  function deveExibirSelo(
    exibirSeloGeral: boolean,
    produtoId: string,
    seloProdutosIds?: string[] | null
  ): boolean {
    if (!exibirSeloGeral) return false;
    if (!seloProdutosIds || seloProdutosIds.length === 0) return true;
    return seloProdutosIds.includes(produtoId);
  }

  it("exibe em todos os produtos quando seloProdutosIds for nulo ou vazio", () => {
    expect(deveExibirSelo(true, "prod-1", null)).toBe(true);
    expect(deveExibirSelo(true, "prod-2", [])).toBe(true);
  });

  it("não exibe quando o selo geral estiver desativado", () => {
    expect(deveExibirSelo(false, "prod-1", null)).toBe(false);
    expect(deveExibirSelo(false, "prod-1", ["prod-1"])).toBe(false);
  });

  it("exibe apenas nos produtos selecionados quando seloProdutosIds estiver configurado", () => {
    const selecionados = ["prod-1", "prod-3"];
    expect(deveExibirSelo(true, "prod-1", selecionados)).toBe(true);
    expect(deveExibirSelo(true, "prod-2", selecionados)).toBe(false);
    expect(deveExibirSelo(true, "prod-3", selecionados)).toBe(true);
  });
});
