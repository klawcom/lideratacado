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
  normalizarNomeCor,
} from "./colors";

describe("colors module", () => {
  it("tem 23 cores padrão configuradas incluindo Salmão e novos nomes", () => {
    expect(CORES_PADRAO.length).toBe(23);
    const nomes = CORES_PADRAO.map((c) => c.nome);
    expect(nomes).toContain("Branca");
    expect(nomes).toContain("Preta");
    expect(nomes).toContain("Cinza Mescla Claro");
    expect(nomes).toContain("Azul Royal");
    expect(nomes).toContain("Azul Claro");
    expect(nomes).toContain("Rosa Claro");
    expect(nomes).toContain("Rosa Pink");
    expect(nomes).toContain("Palha");
    expect(nomes).toContain("Marrom");
    expect(nomes).toContain("Salmão");
    expect(nomes).toContain("Azul Marinho");
  });

  it("normaliza nomes legados e sinônimos de cores", () => {
    expect(normalizarNomeCor("marrom escuro")).toBe("Marrom");
    expect(normalizarNomeCor("Marrom Claro")).toBe("Palha");
    expect(normalizarNomeCor("azul")).toBe("Azul Royal");
    expect(normalizarNomeCor("Azul Bebê")).toBe("Azul Claro");
    expect(normalizarNomeCor("azul bebe")).toBe("Azul Claro");
    expect(normalizarNomeCor("rosa bebê")).toBe("Rosa Claro");
    expect(normalizarNomeCor("pink")).toBe("Rosa Pink");
    expect(normalizarNomeCor("cinza")).toBe("Cinza Mescla Claro");
  });

  it("getCorDef encontra cores sem distinção de maiúsculas e resolve aliases antigos", () => {
    const branca = getCorDef("branca");
    expect(branca.hex).toBe("#FFFFFF");
    const preta = getCorDef("PRETA");
    expect(preta.hex).toBe("#111111");
    const cinza = getCorDef("cinza");
    expect(cinza.nome).toBe("Cinza Mescla Claro");
    expect(cinza.hex).toBe("#CBD5E1");
    const marromEscuro = getCorDef("marrom escuro");
    expect(marromEscuro.nome).toBe("Marrom");
    const marromClaro = getCorDef("marrom claro");
    expect(marromClaro.nome).toBe("Palha");
    const azul = getCorDef("azul");
    expect(azul.nome).toBe("Azul Royal");
    const salmao = getCorDef("salmão");
    expect(salmao.nome).toBe("Salmão");
    expect(salmao.hex).toBe("#FA8072");
    const desc = getCorDef("cor inexistente");
    expect(desc.hex).toBe("#888888");
  });

  it("classifica cores claras e escuras para contraste ideal em temas claro e escuro", () => {
    // Cores claras (precisam de borda no tema claro)
    expect(isCorClara("#FFFFFF")).toBe(true); // Branca
    expect(isCorClara("#F5F5F0")).toBe(true); // Off-white
    expect(isCorClara("#FEF3C7")).toBe(true); // Creme
    expect(isCorClara("#D4C5A9")).toBe(true); // Bege
    expect(isCorClara("#E8D8B8")).toBe(true); // Palha
    expect(isCorClara("#CBD5E1")).toBe(true); // Cinza Mescla Claro
    expect(isCorClara("#111111")).toBe(false); // Preta não é clara

    // Cores escuras (precisam de borda e destaque no tema escuro)
    expect(isCorEscura("#111111")).toBe(true); // Preta
    expect(isCorEscura("#000000")).toBe(true); // Puro preto
    expect(isCorEscura("#451A03")).toBe(true); // Marrom
    expect(isCorEscura("#1E3A8A")).toBe(true); // Azul Marinho
    expect(isCorEscura("#FFFFFF")).toBe(false); // Branca não é escura
    expect(isCorEscura("#2563EB")).toBe(false); // Azul Royal padrão não é escura extrema
  });

  it("getCorContrasteClasses gera classes apropriadas para cada tom de cor", () => {
    const classesBranca = getCorContrasteClasses("#FFFFFF");
    expect(classesBranca).toContain("border-slate-300");

    const classesPreta = getCorContrasteClasses("#111111");
    expect(classesPreta).toContain("dark:border-slate-300");

    const classesAzul = getCorContrasteClasses("#2563EB");
    expect(classesAzul).toContain("border-black/15");
  });

  it("decodeCoresProduto retorna todas as 23 cores quando vazio", () => {
    const res = decodeCoresProduto("100% Algodão");
    expect(res.composicaoLimpa).toBe("100% Algodão");
    expect(res.coresHabilitadas.length).toBe(23);
    expect(res.coresHabilitadas).toContain("Salmão");
    expect(res.coresHabilitadas).toContain("Palha");
  });

  it("decodeCoresProduto normaliza cores antigas armazenadas no banco", () => {
    const antigo = '100% Algodão<!--cores:["Azul","Marrom Escuro","Marrom Claro","Pink","Cinza"]--><!--foto_cores:{"f1":"Azul","f2":"Marrom Claro"}-->';
    const res = decodeCoresProduto(antigo);
    expect(res.coresHabilitadas).toEqual([
      "Azul Royal",
      "Marrom",
      "Palha",
      "Rosa Pink",
      "Cinza Mescla Claro",
    ]);
    expect(res.fotoCores).toEqual({
      f1: "Azul Royal",
      f2: "Palha",
    });
  });

  it("encode e decode preservam cores selecionadas e limpam texto", () => {
    const selecionadas = ["Branca", "Preta", "Azul Royal", "Salmão"];
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

    // Normaliza cor antiga ao formatar
    const antiga = formatarCorTamanhos("Marrom Claro", { p: 2, m: 0, g: 0, gg: 0 });
    expect(antiga).toBe("palha: 2-P");

    const vazio = formatarCorTamanhos("Preta", { p: 0, m: 0, g: 0, gg: 0 });
    expect(vazio).toBe("");
  });
});
