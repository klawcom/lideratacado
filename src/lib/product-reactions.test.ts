import { describe, it, expect, beforeEach } from "vitest";
import {
  REACTION_CONFIGS,
  gerarContagensBase,
  obterContagensProduto,
  alternarReacaoUsuario,
  obterReacaoDestaque,
} from "./product-reactions";

describe("product-reactions module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("contém os 5 emojis solicitados pelo usuário", () => {
    const ids = REACTION_CONFIGS.map((r) => r.id);
    expect(ids).toEqual(["joinha", "coracao", "dinheiro", "espanto", "fogo"]);

    const emojis = REACTION_CONFIGS.map((r) => r.emoji);
    expect(emojis).toContain("👍");
    expect(emojis).toContain("❤️");
    expect(emojis).toContain("🤑");
    expect(emojis).toContain("😲");
    expect(emojis).toContain("🔥");
  });

  it("gera contagens base determinísticas e positivas para um produto", () => {
    const counts1 = gerarContagensBase("prod-123");
    const counts2 = gerarContagensBase("prod-123");
    expect(counts1).toEqual(counts2);

    expect(counts1.joinha).toBeGreaterThan(0);
    expect(counts1.coracao).toBeGreaterThan(0);
    expect(counts1.dinheiro).toBeGreaterThan(0);
    expect(counts1.espanto).toBeGreaterThan(0);
    expect(counts1.fogo).toBeGreaterThan(0);
  });

  it("permite que o usuário reaja exatamente uma vez", () => {
    const produtoId = "prod-camisa-polo-01";
    const inicial = obterContagensProduto(produtoId);
    expect(inicial.reacaoUsuario).toBeNull();

    // Primeira reação: fogo
    const r1 = alternarReacaoUsuario(produtoId, "fogo");
    expect(r1.reacaoUsuario).toBe("fogo");
    expect(r1.contagens.fogo).toBe(inicial.contagens.fogo + 1);

    // Troca para coração: fogo volta ao base e coração incrementa
    const r2 = alternarReacaoUsuario(produtoId, "coracao");
    expect(r2.reacaoUsuario).toBe("coracao");
    expect(r2.contagens.fogo).toBe(inicial.contagens.fogo);
    expect(r2.contagens.coracao).toBe(inicial.contagens.coracao + 1);

    // Clica novamente em coração: desmarca a reação (toggle)
    const r3 = alternarReacaoUsuario(produtoId, "coracao");
    expect(r3.reacaoUsuario).toBeNull();
    expect(r3.contagens.coracao).toBe(inicial.contagens.coracao);
  });

  it("calcula a reação em destaque corretamente", () => {
    const destaque = obterReacaoDestaque("prod-teste");
    expect(destaque.emoji).toBeTruthy();
    expect(destaque.count).toBeGreaterThan(0);
  });
});
