import { describe, expect, it } from "vitest";
import {
  PESO_CAMISETA_KG,
  PESO_POLO_KG,
  calcularDimensoesPacote,
  calcularPesoTotalKg,
  formatarPrazoFrete,
  pesoUnitarioKg,
} from "./frete";

describe("módulo de frete", () => {
  it("pesos padrão unitários corretos (200g camiseta, 250g polo)", () => {
    expect(PESO_CAMISETA_KG).toBe(0.2);
    expect(PESO_POLO_KG).toBe(0.25);

    expect(pesoUnitarioKg("Camiseta Cotton Pima ARMN XCHNG")).toBe(0.2);
    expect(pesoUnitarioKg("Camiseta Básica Modelo 01")).toBe(0.2);
    expect(pesoUnitarioKg("Camisa Polo Piquet")).toBe(0.25);
    expect(pesoUnitarioKg("Polo Tradicional")).toBe(0.25);
  });

  it("calcula peso total com embalagem e mínimo de 0.3kg", () => {
    // 1 camiseta: 0.2kg + 0.05kg = 0.25kg -> mínimo 0.3kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 1 }])).toBe(0.3);

    // 10 camisetas: 10 * 0.2 = 2.0kg + 0.05kg = 2.05kg
    expect(calcularPesoTotalKg([{ nome: "Camiseta Pima", pecas: 10 }])).toBe(2.05);

    // 10 polos: 10 * 0.25 = 2.5kg + 0.05kg = 2.55kg
    expect(calcularPesoTotalKg([{ nome: "Polo Piquet", pecas: 10 }])).toBe(2.55);

    // Misto: 10 camisetas (2.0kg) + 4 polos (1.0kg) = 3.0kg + 0.05kg = 3.05kg
    expect(
      calcularPesoTotalKg([
        { nome: "Camiseta Pima", pecas: 10 },
        { nome: "Camisa Polo", pecas: 4 },
      ]),
    ).toBe(3.05);
  });

  it("usa dimensões base de 1cm altura, 8cm largura e 13cm comprimento", () => {
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
});
