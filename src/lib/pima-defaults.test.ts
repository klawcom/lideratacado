import { describe, expect, it } from "vitest";
import {
  COMPOSICAO_COTTON_PIMA,
  DESCRICAO_COTTON_PIMA,
  MEDIDAS_COTTON_PIMA,
  TEXTO_MEDIDAS_COTTON_PIMA,
  isProdutoCottonPima,
} from "./pima-defaults";

describe("padrões da categoria Cotton Pima", () => {
  it("contém a descrição oficial solicitada", () => {
    expect(DESCRICAO_COTTON_PIMA).toContain("Malha peruana Cotton Pima");
    expect(DESCRICAO_COTTON_PIMA).toContain("Com elastano: veste bem e não perde a forma");
    expect(DESCRICAO_COTTON_PIMA).toContain("Cores variadas (sortidas)");
    expect(DESCRICAO_COTTON_PIMA).toContain("Tamanhos P ao GG");
  });

  it("contém a composição oficial", () => {
    expect(COMPOSICAO_COTTON_PIMA).toBe("100% Algodão Pima");
  });

  it("contém as 4 medidas de camisetas masculinas", () => {
    expect(MEDIDAS_COTTON_PIMA).toHaveLength(4);
    expect(MEDIDAS_COTTON_PIMA[0]).toEqual({ tamanho: "P", largura: "50cm", altura: "63cm" });
    expect(MEDIDAS_COTTON_PIMA[1]).toEqual({ tamanho: "M", largura: "52cm", altura: "66cm" });
    expect(MEDIDAS_COTTON_PIMA[2]).toEqual({ tamanho: "G", largura: "55cm", altura: "69cm" });
    expect(MEDIDAS_COTTON_PIMA[3]).toEqual({ tamanho: "GG", largura: "58cm", altura: "70cm" });

    expect(TEXTO_MEDIDAS_COTTON_PIMA).toContain("CAMISETAS MASCULINAS");
    expect(TEXTO_MEDIDAS_COTTON_PIMA).toContain("P. 50cm largura x 63cm altura");
  });

  it("identifica produtos Cotton Pima por categoria, modelo ou nome", () => {
    expect(isProdutoCottonPima({ categoria_id: "11111111-1111-1111-1111-111111111111" })).toBe(true);
    expect(isProdutoCottonPima({ categorias: { slug: "camisetas-cotton-pima" } })).toBe(true);
    expect(isProdutoCottonPima({ codigo_modelo: "PIMA-01" })).toBe(true);
    expect(isProdutoCottonPima({ nome: "CAMISETA COTTON PIMA - RMN" })).toBe(true);

    expect(isProdutoCottonPima({ categoria_id: "22222222-2222-2222-2222-222222222222", codigo_modelo: "PP-01", nome: "Polo Piquet" })).toBe(false);
  });
});
