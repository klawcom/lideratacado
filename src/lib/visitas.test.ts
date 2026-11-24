import { describe, expect, it } from "vitest";
import {
  calcularResumoVisitas,
  calcularTaxaConversao,
  formatarDataCurta,
  formatarDataIso,
  type VisitasData,
} from "./visitas";

describe("visitas module", () => {
  it("formatarDataIso e formatarDataCurta funcionam corretamente", () => {
    const d = new Date(2026, 10, 24); // 24 de Novembro de 2026
    expect(formatarDataIso(d)).toBe("2026-11-24");
    expect(formatarDataCurta(d)).toBe("24/11");
  });

  it("calcularTaxaConversao calcula percentual formatado em pt-BR", () => {
    expect(calcularTaxaConversao(0, 100)).toBe("0,0%");
    expect(calcularTaxaConversao(5, 0)).toBe("0,0%");
    expect(calcularTaxaConversao(5, 100)).toBe("5,0%");
    expect(calcularTaxaConversao(1, 30)).toBe("3,3%");
    expect(calcularTaxaConversao(12, 200)).toBe("6,0%");
  });

  it("calcularResumoVisitas lida com dados nulos ou vazios", () => {
    const resumo = calcularResumoVisitas(null, 0, 0, new Date(2026, 10, 24));
    expect(resumo.hoje.visitas).toBe(0);
    expect(resumo.hoje.pageviews).toBe(0);
    expect(resumo.totalGeral).toBe(0);
    expect(resumo.ultimos7Dias.visitas).toBe(0);
    expect(resumo.ultimos30Dias.visitas).toBe(0);
    expect(resumo.taxaConversaoHoje).toBe("0,0%");
    expect(resumo.historicoDiario).toHaveLength(14);
  });

  it("calcularResumoVisitas consolida métricas de hoje, ontem e últimos dias", () => {
    const ref = new Date(2026, 10, 24);
    const mockData: VisitasData = {
      total: 150,
      totalPageviews: 450,
      dias: {
        "2026-11-24": { visitas: 25, pageviews: 80 },
        "2026-11-23": { visitas: 20, pageviews: 60 },
        "2026-11-22": { visitas: 15, pageviews: 45 },
      },
    };

    const resumo = calcularResumoVisitas(mockData, 5, 2, ref);

    expect(resumo.hoje.visitas).toBe(25);
    expect(resumo.hoje.pageviews).toBe(80);
    expect(resumo.ontem.visitas).toBe(20);
    expect(resumo.ontem.pageviews).toBe(60);
    expect(resumo.ultimos7Dias.visitas).toBe(60); // 25 + 20 + 15
    expect(resumo.ultimos30Dias.visitas).toBe(60);
    expect(resumo.totalGeral).toBe(150);
    expect(resumo.totalPageviews).toBe(450);
    // 2 pedidos hoje / 25 visitas hoje = 8,0%
    expect(resumo.taxaConversaoHoje).toBe("8,0%");
    // 5 pedidos / 60 visitas nos 30 dias = 8,3%
    expect(resumo.taxaConversao30Dias).toBe("8,3%");
    expect(resumo.historicoDiario).toHaveLength(14);
    expect(resumo.historicoDiario[13]?.data).toBe("2026-11-24");
    expect(resumo.historicoDiario[13]?.visitas).toBe(25);
  });
});
