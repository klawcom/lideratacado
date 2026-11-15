import { describe, expect, it } from "vitest";
import {
  TAMANHOS,
  TAMANHOS_PADRAO,
  TAMANHOS_PLUS_SIZE,
  calcularPedido,
  faixaDoTotal,
  pecas,
} from "./pricing";

const camiseta = [
  { quantidade_minima: 10, preco_peca: 29.9 },
  { quantidade_minima: 20, preco_peca: 27.9 },
  { quantidade_minima: 30, preco_peca: 25.9 },
  { quantidade_minima: 50, preco_peca: 23.9 },
];
const polo = [
  { quantidade_minima: 10, preco_peca: 49.9 },
  { quantidade_minima: 20, preco_peca: 46.9 },
  { quantidade_minima: 30, preco_peca: 43.9 },
  { quantidade_minima: 50, preco_peca: 39.9 },
];
const linha = (id: string, faixas: typeof camiseta, p: number, m = 0, g = 0, gg = 0) => ({ produtoId: id, faixas, qtd: { p, m, g, gg } });

describe("faixas de preço pelo total do pedido", () => {
  it("usa 10-19, 20-29, 30-49 e 50+", () => {
    expect(faixaDoTotal(10)).toBe(10);
    expect(faixaDoTotal(19)).toBe(10);
    expect(faixaDoTotal(20)).toBe(20);
    expect(faixaDoTotal(29)).toBe(20);
    expect(faixaDoTotal(30)).toBe(30);
    expect(faixaDoTotal(49)).toBe(30);
    expect(faixaDoTotal(50)).toBe(50);
  });

  it("9 peças bloqueia a finalização e faltam 1", () => {
    const r = calcularPedido([linha("a", camiseta, 5), linha("b", polo, 0, 4)], 10);
    expect(r.totalPecas).toBe(9);
    expect(r.faltamMinimo).toBe(1);
    expect(r.podeFinalizar).toBe(false);
  });

  it("10 peças misturando categorias libera e usa a faixa de 10", () => {
    const r = calcularPedido([linha("a", camiseta, 5), linha("b", polo, 0, 5)], 10);
    expect(r.podeFinalizar).toBe(true);
    expect(r.faixa).toBe(10);
    expect(r.total).toBe(5 * 29.9 + 5 * 49.9);
  });

  it("25 peças aplica a faixa de 20 a todos os itens e faltam 5 para a de 30", () => {
    const r = calcularPedido([linha("a", camiseta, 10, 5), linha("b", polo, 5, 0, 5)], 10);
    expect(r.totalPecas).toBe(25);
    expect(r.faixa).toBe(20);
    expect(r.itens.map((i) => i.preco)).toEqual([27.9, 46.9]);
    expect(r.proxima).toEqual({ faixa: 30, faltam: 5 });
    expect(r.itens[0]!.precoProxima).toBe(25.9);
  });

  it("50 peças aplica a maior faixa e não há próxima", () => {
    const r = calcularPedido([linha("a", camiseta, 10, 10, 10), linha("b", polo, 5, 5, 5, 5)], 10);
    expect(r.totalPecas).toBe(50);
    expect(r.faixa).toBe(50);
    expect(r.total).toBe(Math.round((30 * 23.9 + 20 * 39.9) * 100) / 100);
    expect(r.proxima).toBeNull();
  });

  it("calcula peças e faixas incluindo tamanhos plus size G1 e G2", () => {
    expect(TAMANHOS_PADRAO.map((t) => t.label)).toEqual(["P", "M", "G", "GG"]);
    expect(TAMANHOS_PLUS_SIZE.map((t) => t.label)).toEqual(["G1", "G2"]);
    expect(TAMANHOS.map((t) => t.label)).toEqual(["P", "M", "G", "GG", "G1", "G2"]);

    expect(pecas({ g1: 6, g2: 4 })).toBe(10);
    const r = calcularPedido([{ produtoId: "plus-1", faixas: camiseta, qtd: { g1: 6, g2: 4 } }], 10);
    expect(r.totalPecas).toBe(10);
    expect(r.podeFinalizar).toBe(true);
    expect(r.faixa).toBe(10);
  });
});
