import { describe, expect, it } from "vitest";
import { CORES_PADRAO, decodeCoresProduto, encodeCoresProduto, formatarCorTamanhos, getCorDef } from "./colors";

describe("colors module", () => {
  it("tem 22 cores padrão configuradas", () => {
    expect(CORES_PADRAO.length).toBe(22);
    expect(CORES_PADRAO.map((c) => c.nome)).toContain("Branca");
    expect(CORES_PADRAO.map((c) => c.nome)).toContain("Preta");
    expect(CORES_PADRAO.map((c) => c.nome)).toContain("Cinza");
    expect(CORES_PADRAO.map((c) => c.nome)).toContain("Azul Marinho");
  });

  it("getCorDef encontra cores sem distinção de maiúsculas", () => {
    const branca = getCorDef("branca");
    expect(branca.hex).toBe("#FFFFFF");
    const preta = getCorDef("PRETA");
    expect(preta.hex).toBe("#111111");
    const cinza = getCorDef("cinza");
    expect(cinza.hex).toBe("#9CA3AF");
    const desc = getCorDef("cor inexistente");
    expect(desc.hex).toBe("#888888");
  });

  it("decodeCoresProduto retorna todas as cores quando vazio", () => {
    const res = decodeCoresProduto("100% Algodão");
    expect(res.composicaoLimpa).toBe("100% Algodão");
    expect(res.coresHabilitadas.length).toBe(22);
  });

  it("encode e decode preservam cores selecionadas e limpam texto", () => {
    const selecionadas = ["Branca", "Preta", "Azul"];
    const encoded = encodeCoresProduto("100% Algodão", selecionadas);
    expect(encoded).toContain("100% Algodão");
    expect(encoded).toContain("<!--cores:");

    const decoded = decodeCoresProduto(encoded);
    expect(decoded.composicaoLimpa).toBe("100% Algodão");
    expect(decoded.coresHabilitadas).toEqual(selecionadas);
  });

  it("formatarCorTamanhos gera string no formato correto: cor: 1-P, 2-M, 4-G, 2-GG", () => {
    const formatado = formatarCorTamanhos("Branca", { p: 1, m: 2, g: 4, gg: 2 });
    expect(formatado).toBe("branca: 1-P, 2-M, 4-G, 2-GG");

    const parcial = formatarCorTamanhos("Azul Marinho", { p: 0, m: 3, g: 0, gg: 1 });
    expect(parcial).toBe("azul marinho: 3-M, 1-GG");

    const vazio = formatarCorTamanhos("Preta", { p: 0, m: 0, g: 0, gg: 0 });
    expect(vazio).toBe("");
  });
});
