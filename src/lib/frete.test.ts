import { describe, expect, it } from "vitest";
import {
  DIMENSOES_BASE,
  PESO_CAMISETA_KG,
  PESO_MINIMO_ATE_10_PECAS_KG,
  PESO_POLO_KG,
  calcularDimensoesPacote,
  calcularPesoTotalKg,
  formatarPrazoFrete,
  logoFrete,
  pesoUnitarioKg,
} from "./frete";

describe("módulo de frete", () => {
  it("pesos padrão unitários corretos (200g camiseta, 250g polo)", () => {
    expect(PESO_CAMISETA_KG).toBe(0.2);
    expect(PESO_POLO_KG).toBe(0.25);
    expect(PESO_MINIMO_ATE_10_PECAS_KG).toBe(4.0);

    expect(pesoUnitarioKg("Camiseta Cotton Pima ARMN XCHNG")).toBe(0.2);
    expect(pesoUnitarioKg("Camiseta Básica Modelo 01")).toBe(0.2);
    expect(pesoUnitarioKg("Camisa Polo Piquet")).toBe(0.25);
    expect(pesoUnitarioKg("Polo Tradicional")).toBe(0.25);
  });

  it("considera sempre 4kg para pedidos de até 10 peças", () => {
    // 1 camiseta: sempre 4kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 1 }])).toBe(4.0);

    // 5 camisetas: sempre 4kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 5 }])).toBe(4.0);

    // 10 camisetas: sempre 4kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 10 }])).toBe(4.0);

    // 10 polos: sempre 4kg
    expect(calcularPesoTotalKg([{ nome: "Polo Piquet", pecas: 10 }])).toBe(4.0);

    // Misto até 10 peças (ex: 6 camisetas + 4 polos): sempre 4kg
    expect(
      calcularPesoTotalKg([
        { nome: "Camiseta Pima", pecas: 6 },
        { nome: "Camisa Polo", pecas: 4 },
      ]),
    ).toBe(4.0);
  });

  it("calcula peso proporcional para pedidos com mais de 10 peças", () => {
    // 11 camisetas: 4.0kg + 1 * 0.2kg = 4.2kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 11 }])).toBe(4.2);

    // 15 camisetas: 4.0kg + 5 * 0.2kg = 5.0kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 15 }])).toBe(5.0);

    // 20 camisetas: 4.0kg + 10 * 0.2kg = 6.0kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 20 }])).toBe(6.0);

    // 15 polos: 4.0kg + 5 * 0.25kg = 5.25kg
    expect(calcularPesoTotalKg([{ nome: "Polo Piquet", pecas: 15 }])).toBe(5.25);
  });

  it("usa dimensões mínimas da caixa: 1cm altura, 8cm largura e 13cm comprimento", () => {
    expect(DIMENSOES_BASE.altura).toBe(1);
    expect(DIMENSOES_BASE.largura).toBe(8);
    expect(DIMENSOES_BASE.comprimento).toBe(13);

    const p1 = calcularDimensoesPacote(5);
    expect(p1.altura).toBe(1);
    expect(p1.largura).toBe(8);
    expect(p1.comprimento).toBe(13);

    const p2 = calcularDimensoesPacote(50);
    expect(p2.altura).toBe(1);
    expect(p2.largura).toBe(8);
    expect(p2.comprimento).toBe(13);
  });

  it("formata prazo de dias úteis", () => {
    expect(formatarPrazoFrete(1)).toBe("Em até 1 dia útil");
    expect(formatarPrazoFrete(4)).toBe("Em até 4 dias úteis");
    expect(formatarPrazoFrete(8)).toBe("Em até 8 dias úteis");
  });

  it("retorna o logo correto para PAC e SEDEX", () => {
    expect(logoFrete("PAC")).toBe("/frete-pac.png");
    expect(logoFrete("PAC Correios")).toBe("/frete-pac.png");
    expect(logoFrete("SEDEX")).toBe("/frete-sedex.png");
    expect(logoFrete("SEDEX 10")).toBe("/frete-sedex.png");
    expect(logoFrete("Transportadora")).toBeNull();
    expect(logoFrete("")).toBeNull();
  });
});
