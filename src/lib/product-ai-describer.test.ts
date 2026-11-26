import { describe, it, expect } from "vitest";
import {
  detectarTipoTecido,
  gerarDescricaoIA,
  obterDescricaoPadraoCategoria,
  isDescricaoGenericaOuAntiga,
  obterDescricaoOficialProduto,
  DESCRICAO_CEO_COTTON_PIMA,
  DESCRICAO_CEO_POLO_PIQUET,
  DESCRICAO_CEO_PLUS_SIZE,
  DESCRICAO_CEO_BASICA_PREMIUM,
} from "./product-ai-describer";

describe("product-ai-describer module", () => {
  it("detecta corretamente o tipo de tecido pelo nome ou código", () => {
    expect(detectarTipoTecido("Camiseta Cotton Pima Modelo 01", "PIMA01")).toBe("cotton_pima");
    expect(detectarTipoTecido("Camisa Polo Piquet Modelo 02", "POLO02")).toBe("piquet_duplo");
    expect(detectarTipoTecido("Camiseta Plus Size G1 G2", "PLUS01")).toBe("plus_size");
    expect(detectarTipoTecido("Camiseta Básica", "BASICA01")).toBe("cotton_pima");
  });

  it("garante que todas as descrições oficiais possuem no máximo 750 caracteres", () => {
    expect(DESCRICAO_CEO_COTTON_PIMA.length).toBeLessThanOrEqual(750);
    expect(DESCRICAO_CEO_POLO_PIQUET.length).toBeLessThanOrEqual(750);
    expect(DESCRICAO_CEO_PLUS_SIZE.length).toBeLessThanOrEqual(750);
    expect(DESCRICAO_CEO_BASICA_PREMIUM.length).toBeLessThanOrEqual(750);
  });

  it("não inclui medidas repetidas nas descrições da IA (pois já existe widget na página)", () => {
    expect(DESCRICAO_CEO_COTTON_PIMA).not.toContain("Medidas aproximadas");
    expect(DESCRICAO_CEO_POLO_PIQUET).not.toContain("Medidas aproximadas");
    expect(DESCRICAO_CEO_PLUS_SIZE).not.toContain("Medidas aproximadas");
    expect(DESCRICAO_CEO_BASICA_PREMIUM).not.toContain("Medidas aproximadas");
  });

  it("contém destaques em negrito (markdown **) para atrair o cliente", () => {
    expect(DESCRICAO_CEO_COTTON_PIMA).toContain("**");
    expect(DESCRICAO_CEO_POLO_PIQUET).toContain("**");
    expect(DESCRICAO_CEO_PLUS_SIZE).toContain("**");
    expect(DESCRICAO_CEO_BASICA_PREMIUM).toContain("**");
  });

  it("gera descrição com autoridade de CEO para Cotton Pima", () => {
    const desc = gerarDescricaoIA({
      nomeProduto: "Camiseta Cotton Pima Peruano Modelo 01",
      codigoModelo: "PIMA01",
    });

    expect(desc.length).toBeLessThanOrEqual(750);
    expect(desc).toContain("Cotton Pima");
    expect(desc).toContain("lucro superior a 100%");
    expect(desc).not.toContain("Medidas aproximadas");
  });

  it("gera descrição com autoridade de CEO para Polo Piquet Duplo", () => {
    const desc = gerarDescricaoIA({
      nomeProduto: "Camisa Polo Peruana Modelo 04",
      codigoModelo: "POLO04",
      tipoTecido: "piquet_duplo",
    });

    expect(desc.length).toBeLessThanOrEqual(750);
    expect(desc).toContain("Piquet Duplo");
    expect(desc).toContain("Gola e Punhos Estruturados");
    expect(desc).not.toContain("Medidas aproximadas");
  });

  it("identifica corretamente descrições genéricas ou antigas", () => {
    expect(isDescricaoGenericaOuAntiga("")).toBe(true);
    expect(isDescricaoGenericaOuAntiga(null)).toBe(true);
    expect(isDescricaoGenericaOuAntiga("Camiseta Pima Modelo 01. Cores sortidas...")).toBe(true);
    expect(isDescricaoGenericaOuAntiga("Camisa Polo Modelo 02. Camisa polo de caimento clássico...")).toBe(true);
    expect(isDescricaoGenericaOuAntiga(DESCRICAO_CEO_COTTON_PIMA)).toBe(false);
  });

  it("aplica automaticamente a descrição oficial de acordo com a categoria", () => {
    const pPima = { nome: "Camiseta Pima Modelo 05", codigo_modelo: "PIMA-05", descricao: "" };
    expect(obterDescricaoOficialProduto(pPima)).toBe(DESCRICAO_CEO_COTTON_PIMA);

    const pPolo = { nome: "Camisa Polo Modelo 03", codigo_modelo: "POLO-03", descricao: "Camisa Polo Modelo 03..." };
    expect(obterDescricaoOficialProduto(pPolo)).toBe(DESCRICAO_CEO_POLO_PIQUET);

    const pPlus = { nome: "Camiseta Plus Size Modelo 01", codigo_modelo: "PLUS-01", descricao: null };
    expect(obterDescricaoOficialProduto(pPlus)).toBe(DESCRICAO_CEO_PLUS_SIZE);
  });
});
