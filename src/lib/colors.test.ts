import { describe, expect, it } from "vitest";
import {
  CORES_PADRAO,
  decodeCoresProduto,
  encodeCoresProduto,
  formatarCorTamanhos,
  getCorContrasteClasses,
  getCorDef,
  isCorClara,
  isCorEscura,
} from "./colors";

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

  it("classifica cores claras e escuras para contraste ideal em temas claro e escuro", () => {
    // Cores claras (precisam de borda no tema claro)
    expect(isCorClara("#FFFFFF")).toBe(true); // Branca
    expect(isCorClara("#F5F5F0")).toBe(true); // Off-white
    expect(isCorClara("#FEF3C7")).toBe(true); // Creme
    expect(isCorClara("#D4C5A9")).toBe(true); // Bege
    expect(isCorClara("#111111")).toBe(false); // Preta não é clara

    // Cores escuras (precisam de borda e destaque no tema escuro)
    expect(isCorEscura("#111111")).toBe(true); // Preta
    expect(isCorEscura("#000000")).toBe(true); // Puro preto
    expect(isCorEscura("#451A03")).toBe(true); // Marrom Escuro
    expect(isCorEscura("#1E3A8A")).toBe(true); // Azul Marinho
    expect(isCorEscura("#FFFFFF")).toBe(false); // Branca não é escura
    expect(isCorEscura("#2563EB")).toBe(false); // Azul padrão não é escura extrema
  });

  it("getCorContrasteClasses gera classes apropriadas para cada tom de cor", () => {
    const classesBranca = getCorContrasteClasses("#FFFFFF");
    expect(classesBranca).toContain("border-slate-300");

    const classesPreta = getCorContrasteClasses("#111111");
    expect(classesPreta).toContain("dark:border-slate-300");

    const classesAzul = getCorContrasteClasses("#2563EB");
    expect(classesAzul).toContain("border-black/15");
  });

  it("decodeCoresProduto retorna todas as cores quando vazio", () => {
    const res = decodeCoresProduto("100% Algodão");
    expect(res.composicaoLimpa).toBe("100% Algodão");
    expect(res.coresHabilitadas.length).toBe(22);
  });

  it("encode e decode preservam cores selecionadas e limpam texto", () => {
    const selecionadas = ["Branca", "Preta", "Azul"];
    const fotoCores = { "midia-1": "Branca", "midia-2": "Preta" };
    const encoded = encodeCoresProduto("100% Algodão", selecionadas, fotoCores);
    expect(encoded).toContain("100% Algodão");
    expect(encoded).toContain("<!--cores:");
    expect(encoded).toContain("<!--foto_cores:");

    const decoded = decodeCoresProduto(encoded);
    expect(decoded.composicaoLimpa).toBe("100% Algodão");
    expect(decoded.coresHabilitadas).toEqual(selecionadas);
    expect(decoded.fotoCores).toEqual(fotoCores);
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
