import { describe, it, expect, beforeEach } from "vitest";
import {
  DEPOIMENTOS_INICIAIS,
  inferirRegiao,
  obterTodosDepoimentos,
  salvarDepoimentoLocal,
  filtrarDepoimentosPorRegiao,
  calcularResumoDepoimentos,
  montarMensagemWhatsappDepoimento,
} from "./testimonials";

describe("testimonials module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("possui pelo menos 10 depoimentos cobrindo todas as 5 regiões do Brasil", () => {
    expect(DEPOIMENTOS_INICIAIS.length).toBeGreaterThanOrEqual(10);
    const regioes = new Set(DEPOIMENTOS_INICIAIS.map((d) => d.regiao));
    expect(regioes.has("Sul")).toBe(true);
    expect(regioes.has("Sudeste")).toBe(true);
    expect(regioes.has("Centro-Oeste")).toBe(true);
    expect(regioes.has("Nordeste")).toBe(true);
    expect(regioes.has("Norte")).toBe(true);

    const generos = new Set(DEPOIMENTOS_INICIAIS.map((d) => d.genero));
    expect(generos.has("m")).toBe(true);
    expect(generos.has("f")).toBe(true);
  });

  it("infere corretamente a região pelo estado/UF", () => {
    expect(inferirRegiao("BA")).toBe("Nordeste");
    expect(inferirRegiao("sp")).toBe("Sudeste");
    expect(inferirRegiao("SC")).toBe("Sul");
    expect(inferirRegiao("GO")).toBe("Centro-Oeste");
    expect(inferirRegiao("AM")).toBe("Norte");
    expect(inferirRegiao("XX")).toBe("Sudeste"); // fallback
  });

  it("filtra depoimentos por região", () => {
    const sul = filtrarDepoimentosPorRegiao(DEPOIMENTOS_INICIAIS, "Sul");
    expect(sul.length).toBeGreaterThan(0);
    expect(sul.every((d) => d.regiao === "Sul")).toBe(true);

    const todas = filtrarDepoimentosPorRegiao(DEPOIMENTOS_INICIAIS, "Todas");
    expect(todas.length).toBe(DEPOIMENTOS_INICIAIS.length);
  });

  it("calcula resumo de avaliações corretamente", () => {
    const resumo = calcularResumoDepoimentos(DEPOIMENTOS_INICIAIS);
    expect(resumo.media).toBe(5.0);
    expect(resumo.total).toBe(DEPOIMENTOS_INICIAIS.length);
    expect(resumo.porcentagemRecompra).toBeGreaterThan(0);
    expect(resumo.recomendam).toBe(100);
  });

  it("salva e recupera novo depoimento no localStorage", () => {
    const novo = salvarDepoimentoLocal({
      nome: "Luan Pereira",
      cidade: "Maringá",
      estado: "PR",
      tipoCliente: "Lojista",
      nota: 5,
      texto: "As peças chegaram em 2 dias, qualidade maravilhosa!",
    });

    expect(novo.id).toContain("dep-local-");
    expect(novo.regiao).toBe("Sul");
    expect(novo.verificado).toBe(true);

    const todos = obterTodosDepoimentos();
    expect(todos[0].id).toBe(novo.id);
    expect(todos.length).toBe(DEPOIMENTOS_INICIAIS.length + 1);
  });

  it("monta mensagem formatada para WhatsApp", () => {
    const msg = montarMensagemWhatsappDepoimento(
      {
        nome: "Maria Silva",
        cidade: "Recife",
        estado: "PE",
        nota: 5,
        texto: "Roupas excelentes e bem embaladas!",
      },
      1234,
    );

    expect(msg).toContain("Pedido #1234");
    expect(msg).toContain("Maria Silva");
    expect(msg).toContain("Recife - PE");
    expect(msg).toContain("⭐⭐⭐⭐⭐");
    expect(msg).toContain("Roupas excelentes e bem embaladas!");
  });
});
