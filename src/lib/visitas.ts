export type DiaVisitas = {
  visitas: number;      // Visitantes únicos no dia
  pageviews: number;    // Visualizações totais de página
};

export type VisitasData = {
  total: number;
  totalPageviews: number;
  dias: Record<string, DiaVisitas>;
  updated_at?: string;
};

export type ItemHistoricoDiario = {
  data: string;        // YYYY-MM-DD
  dataLabel: string;   // DD/MM
  visitas: number;
  pageviews: number;
};

export type ResumoVisitas = {
  hoje: DiaVisitas;
  ontem: DiaVisitas;
  ultimos7Dias: DiaVisitas;
  ultimos30Dias: DiaVisitas;
  totalGeral: number;
  totalPageviews: number;
  taxaConversaoHoje: string;
  taxaConversao30Dias: string;
  historicoDiario: ItemHistoricoDiario[];
};

/**
 * Formata data no padrão ISO YYYY-MM-DD considerando fuso local/UTC
 */
export function formatarDataIso(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Formata data no padrão brasileiro DD/MM
 */
export function formatarDataCurta(d: Date): string {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

/**
 * Calcula a taxa de conversão em porcentagem (ex: 3.5%)
 */
export function calcularTaxaConversao(pedidos: number, visitas: number): string {
  if (visitas <= 0 || pedidos <= 0) return "0,0%";
  const taxa = (pedidos / visitas) * 100;
  return `${taxa.toFixed(1).replace(".", ",")}%`;
}

/**
 * Processa os dados brutos de visitas para exibição no Dashboard Administrativo
 */
export function calcularResumoVisitas(
  raw: VisitasData | null | undefined,
  totalPedidos = 0,
  pedidosHoje = 0,
  dataReferencia: Date = new Date(),
): ResumoVisitas {
  const dados: VisitasData = raw && typeof raw === "object"
    ? {
        total: Number(raw.total) || 0,
        totalPageviews: Number(raw.totalPageviews) || 0,
        dias: raw.dias && typeof raw.dias === "object" ? raw.dias : {},
      }
    : { total: 0, totalPageviews: 0, dias: {} };

  const hojeIso = formatarDataIso(dataReferencia);
  const dataOntem = new Date(dataReferencia);
  dataOntem.setDate(dataOntem.getDate() - 1);
  const ontemIso = formatarDataIso(dataOntem);

  const hoje: DiaVisitas = {
    visitas: Number(dados.dias[hojeIso]?.visitas) || 0,
    pageviews: Number(dados.dias[hojeIso]?.pageviews) || 0,
  };

  const ontem: DiaVisitas = {
    visitas: Number(dados.dias[ontemIso]?.visitas) || 0,
    pageviews: Number(dados.dias[ontemIso]?.pageviews) || 0,
  };

  // Histórico dos últimos 14 dias para gráfico
  const historicoDiario: ItemHistoricoDiario[] = [];
  let ultimos7Visitas = 0;
  let ultimos7PV = 0;
  let ultimos30Visitas = 0;
  let ultimos30PV = 0;

  // Itera os últimos 30 dias de trás para frente
  for (let i = 29; i >= 0; i--) {
    const d = new Date(dataReferencia);
    d.setDate(d.getDate() - i);
    const iso = formatarDataIso(d);
    const itemDia = dados.dias[iso];
    const v = Number(itemDia?.visitas) || 0;
    const pv = Number(itemDia?.pageviews) || 0;

    ultimos30Visitas += v;
    ultimos30PV += pv;

    if (i < 7) {
      ultimos7Visitas += v;
      ultimos7PV += pv;
    }

    // Apenas os últimos 14 dias são incluídos no gráfico para não poluir
    if (i < 14) {
      historicoDiario.push({
        data: iso,
        dataLabel: formatarDataCurta(d),
        visitas: v,
        pageviews: pv,
      });
    }
  }

  const taxaConversaoHoje = calcularTaxaConversao(pedidosHoje, hoje.visitas);
  const taxaConversao30Dias = calcularTaxaConversao(totalPedidos, ultimos30Visitas);

  return {
    hoje,
    ontem,
    ultimos7Dias: { visitas: ultimos7Visitas, pageviews: ultimos7PV },
    ultimos30Dias: { visitas: ultimos30Visitas, pageviews: ultimos30PV },
    totalGeral: Math.max(dados.total, ultimos30Visitas),
    totalPageviews: Math.max(dados.totalPageviews, ultimos30PV),
    taxaConversaoHoje,
    taxaConversao30Dias,
    historicoDiario,
  };
}
