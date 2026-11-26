import { describe, it, expect } from "vitest";
import {
  detectarTipoTecido,
  gerarDescricaoIA,
  DESCRICAO_CEO_COTTON_PIMA,
  DESCRICAO_CEO_POLO_PIQUET,
  DESCRICAO_CEO_PLUS_SIZE,
} from "./product-ai-describer";

describe("product-ai-describer module", () => {
  it("detecta corretamente o tipo de tecido pelo nome ou código", () => {
    expect(detectarTipoTecido("Camiseta Cotton Pima Modelo 01", "PIMA01")).toBe("cotton_pima");
    expect(detectarTipoTecido("Camisa Polo Piquet Modelo 02", "POLO02")).toBe("piquet_duplo");
    expect(detectarTipoTecido("Camiseta Plus Size G1 G2", "PLUS01")).toBe("plus_size");
  });

  it("gera descrição com autoridade de CEO para Cotton Pima", () => {
    const desc = gerarDescricaoIA({
      nomeProduto: "Camiseta Cotton Pima Peruano Modelo 01",
      codigoModelo: "PIMA01",
    });

    expect(desc).toContain("Algodão Cotton Pima Peruano");
    expect(desc).toContain("Diferenciais da Malha & Acabamento");
    expect(desc).toContain("Margem de lucro superior a 100%");
    expect(desc).toContain("Medidas aproximadas");
  });

  it("gera descrição com autoridade de CEO para Polo Piquet Duplo", () => {
    const desc = gerarDescricaoIA({
      nomeProduto: "Camisa Polo Peruana Modelo 04",
      codigoModelo: "POLO04",
      tipoTecido: "piquet_duplo",
    });

    expect(desc).toContain("Piquet Duplo");
    expect(desc).toContain("Gola e punhos com entretela especial");
    expect(desc).toContain("Lucro acima da média");
    expect(desc).toContain("CAMISAS POLOS MASCULINAS");
  });

  it("aplica tom de voz e destaques opcionais quando solicitado", () => {
    const desc = gerarDescricaoIA({
      nomeProduto: "Camiseta Premium",
      tomVoz: "luxo_boutique",
      destacarMargemLucro: true,
      destacarPreEncolhimento: true,
    });

    expect(desc).toContain("Exclusividade, nobreza têxtil");
    expect(desc).toContain("Margem de Lucro Estratégica");
    expect(desc).toContain("Malha Pré-encolhida e Estabilizada");
  });
});
