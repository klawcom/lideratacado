export interface PedidoRow {
  id: string;
  numero: number;
  status: "novo" | "em_atendimento" | "pago" | "enviado" | "cancelado";
  total: number | string;
  total_pecas: number | string;
  cliente_id: string | null;
  cliente_nome: string;
  cliente_whatsapp?: string;
  cidade: string;
  estado: string;
  created_at: string;
}

export interface ClienteRow {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  cidade: string;
  estado: string;
  created_at: string;
}

export const REGIOES_MAP: Record<string, { regiao: string; cor: string }> = {
  // Sudeste
  SP: { regiao: "Sudeste", cor: "#16A34A" },
  RJ: { regiao: "Sudeste", cor: "#16A34A" },
  MG: { regiao: "Sudeste", cor: "#16A34A" },
  ES: { regiao: "Sudeste", cor: "#16A34A" },
  // Sul
  PR: { regiao: "Sul", cor: "#2563EB" },
  SC: { regiao: "Sul", cor: "#2563EB" },
  RS: { regiao: "Sul", cor: "#2563EB" },
  // Nordeste
  BA: { regiao: "Nordeste", cor: "#8B5CF6" },
  CE: { regiao: "Nordeste", cor: "#8B5CF6" },
  PE: { regiao: "Nordeste", cor: "#8B5CF6" },
  MA: { regiao: "Nordeste", cor: "#8B5CF6" },
  PB: { regiao: "Nordeste", cor: "#8B5CF6" },
  RN: { regiao: "Nordeste", cor: "#8B5CF6" },
  AL: { regiao: "Nordeste", cor: "#8B5CF6" },
  PI: { regiao: "Nordeste", cor: "#8B5CF6" },
  SE: { regiao: "Nordeste", cor: "#8B5CF6" },
  // Centro-Oeste
  MT: { regiao: "Centro-Oeste", cor: "#F59E0B" },
  MS: { regiao: "Centro-Oeste", cor: "#F59E0B" },
  GO: { regiao: "Centro-Oeste", cor: "#F59E0B" },
  DF: { regiao: "Centro-Oeste", cor: "#F59E0B" },
  // Norte
  AM: { regiao: "Norte", cor: "#EC4899" },
  PA: { regiao: "Norte", cor: "#EC4899" },
  RO: { regiao: "Norte", cor: "#EC4899" },
  TO: { regiao: "Norte", cor: "#EC4899" },
  AC: { regiao: "Norte", cor: "#EC4899" },
  AP: { regiao: "Norte", cor: "#EC4899" },
  RR: { regiao: "Norte", cor: "#EC4899" },
};

export const CORES_REGIOES: Record<string, string> = {
  Sudeste: "#16A34A",
  Sul: "#2563EB",
  Nordeste: "#8B5CF6",
  "Centro-Oeste": "#F59E0B",
  Norte: "#EC4899",
  Outros: "#94A3B8",
};

export function calculateStatusStats(pedidos: PedidoRow[]) {
  const total = pedidos.length;

  const finalizados = pedidos.filter((p) => p.status === "pago" || p.status === "enviado");
  const emAberto = pedidos.filter((p) => p.status === "novo" || p.status === "em_atendimento");
  const cancelados = pedidos.filter((p) => p.status === "cancelado");

  const finalizadosValor = finalizados.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const emAbertoValor = emAberto.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const canceladosValor = cancelados.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const totalValor = finalizadosValor + emAbertoValor + canceladosValor;

  const pieData = [
    {
      name: "Finalizados",
      value: finalizados.length,
      valor: finalizadosValor,
      color: "#16A34A",
      percent: total > 0 ? Math.round((finalizados.length / total) * 100) : 0,
      sublabel: "Pagos e Enviados",
    },
    {
      name: "Carrinho Aberto",
      value: emAberto.length,
      valor: emAbertoValor,
      color: "#3B82F6",
      percent: total > 0 ? Math.round((emAberto.length / total) * 100) : 0,
      sublabel: "Novos e Em Atendimento",
    },
    {
      name: "Não Pagos",
      value: cancelados.length,
      valor: canceladosValor,
      color: "#EF4444",
      percent: total > 0 ? Math.round((cancelados.length / total) * 100) : 0,
      sublabel: "Cancelados",
    },
  ];

  return {
    total,
    finalizadosCount: finalizados.length,
    emAbertoCount: emAberto.length,
    canceladosCount: cancelados.length,
    finalizadosValor,
    emAbertoValor,
    canceladosValor,
    totalValor,
    pieData,
  };
}

export function calculateFinanceiroStats(pedidos: PedidoRow[]) {
  const finalizados = pedidos.filter((p) => p.status === "pago" || p.status === "enviado");
  const emAberto = pedidos.filter((p) => p.status === "novo" || p.status === "em_atendimento");
  const cancelados = pedidos.filter((p) => p.status === "cancelado");

  const totalFaturado = finalizados.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const totalPendente = emAberto.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const totalCancelado = cancelados.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  const totalPotencial = totalFaturado + totalPendente;

  const totalPecas = finalizados.reduce((acc, p) => acc + (Number(p.total_pecas) || 0), 0);
  const ticketMedio = finalizados.length > 0 ? totalFaturado / finalizados.length : 0;

  // Gráfico comparativo de barras por status financeiro
  const barrasStatus = [
    {
      estagio: "Confirmado",
      label: "Faturado",
      valor: totalFaturado,
      pedidos: finalizados.length,
      fill: "#16A34A",
    },
    {
      estagio: "Em Aberto",
      label: "A Receber",
      valor: totalPendente,
      pedidos: emAberto.length,
      fill: "#3B82F6",
    },
    {
      estagio: "Não Pago",
      label: "Cancelado",
      valor: totalCancelado,
      pedidos: cancelados.length,
      fill: "#EF4444",
    },
  ];

  // Gráfico de evolução mensal (últimos 6 meses)
  const mesesMap = new Map<string, { mes: string; faturado: number; aberto: number; pecas: number; total: number }>();
  const agora = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nomeMes = d.toLocaleDateString("pt-BR", { month: "short" });
    const formatted = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1).replace(".", "");
    mesesMap.set(key, { mes: formatted, faturado: 0, aberto: 0, pecas: 0, total: 0 });
  }

  for (const p of pedidos) {
    if (!p.created_at) continue;
    const key = p.created_at.slice(0, 7); // "YYYY-MM"
    const entry = mesesMap.get(key);
    if (!entry) continue;

    const val = Number(p.total) || 0;
    const pecas = Number(p.total_pecas) || 0;
    entry.total += 1;

    if (p.status === "pago" || p.status === "enviado") {
      entry.faturado += val;
      entry.pecas += pecas;
    } else if (p.status === "novo" || p.status === "em_atendimento") {
      entry.aberto += val;
    }
  }

  const evolucaoMensal = Array.from(mesesMap.values());

  return {
    totalFaturado,
    totalPendente,
    totalCancelado,
    totalPotencial,
    ticketMedio,
    totalPecas,
    barrasStatus,
    evolucaoMensal,
  };
}

export function calculateRegioesStats(clientes: ClienteRow[], pedidos: PedidoRow[]) {
  // Aggregate from clientes (or fall back to pedidos state if client state is missing)
  const counts: Record<string, number> = {
    Sudeste: 0,
    Sul: 0,
    Nordeste: 0,
    "Centro-Oeste": 0,
    Norte: 0,
    Outros: 0,
  };

  const ufCounts: Record<string, number> = {};

  // Count by unique clients first
  for (const c of clientes) {
    const uf = c.estado ? c.estado.trim().toUpperCase() : "";
    if (uf && uf.length === 2) {
      ufCounts[uf] = (ufCounts[uf] || 0) + 1;
      const r = REGIOES_MAP[uf]?.regiao || "Outros";
      counts[r] = (counts[r] || 0) + 1;
    } else {
      counts.Outros = (counts.Outros || 0) + 1;
    }
  }

  // If no clientes table entries yet, extract from pedidos
  if (clientes.length === 0) {
    for (const p of pedidos) {
      const uf = p.estado ? p.estado.trim().toUpperCase() : "";
      if (uf && uf.length === 2) {
        ufCounts[uf] = (ufCounts[uf] || 0) + 1;
        const r = REGIOES_MAP[uf]?.regiao || "Outros";
        counts[r] = (counts[r] || 0) + 1;
      } else {
        counts.Outros = (counts.Outros || 0) + 1;
      }
    }
  }

  const totalBase = clientes.length || pedidos.length;

  const regioesChartData = Object.entries(counts)
    .filter(([, qtd]) => qtd > 0)
    .map(([regiao, total]) => ({
      name: regiao,
      total,
      percent: totalBase > 0 ? Math.round((total / totalBase) * 100) : 0,
      fill: CORES_REGIOES[regiao] || "#94A3B8",
    }))
    .sort((a, b) => b.total - a.total);

  const topUFs = Object.entries(ufCounts)
    .map(([uf, total]) => ({
      uf,
      total,
      regiao: REGIOES_MAP[uf]?.regiao || "Outros",
      percent: totalBase > 0 ? Math.round((total / totalBase) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    regioesChartData,
    topUFs,
    totalAnalisado: totalBase,
  };
}

export function calculateClientesStats(clientes: ClienteRow[], pedidos: PedidoRow[]) {
  const totalClientes = clientes.length;

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const novosUltimoMes = clientes.filter((c) => {
    if (!c.created_at) return false;
    return new Date(c.created_at) >= trintaDiasAtras;
  }).length;

  const percentualNovos = totalClientes > 0 ? Math.round((novosUltimoMes / totalClientes) * 100) : 0;

  // Group pedidos by client (matching by cliente_id, or by whatsapp / name)
  const clientAggregation = new Map<
    string,
    {
      id: string;
      nome: string;
      whatsapp: string;
      cidade: string;
      estado: string;
      totalPedidos: number;
      totalGasto: number;
      totalPecas: number;
      pedidosFinalizados: number;
    }
  >();

  for (const p of pedidos) {
    const key = p.cliente_id || p.cliente_whatsapp || p.cliente_nome;
    if (!key) continue;

    let item = clientAggregation.get(key);
    if (!item) {
      item = {
        id: p.cliente_id || p.id,
        nome: p.cliente_nome || "Cliente",
        whatsapp: p.cliente_whatsapp || "",
        cidade: p.cidade || "",
        estado: p.estado || "",
        totalPedidos: 0,
        totalGasto: 0,
        totalPecas: 0,
        pedidosFinalizados: 0,
      };
      clientAggregation.set(key, item);
    }

    item.totalPedidos += 1;
    const val = Number(p.total) || 0;
    const pecas = Number(p.total_pecas) || 0;

    if (p.status !== "cancelado") {
      item.totalGasto += val;
      item.totalPecas += pecas;
    }
    if (p.status === "pago" || p.status === "enviado") {
      item.pedidosFinalizados += 1;
    }
  }

  // Rank clients by totalGasto, then by totalPedidos
  const topClientes = Array.from(clientAggregation.values())
    .sort((a, b) => b.totalGasto - a.totalGasto || b.totalPedidos - a.totalPedidos)
    .slice(0, 5);

  return {
    totalClientes,
    novosUltimoMes,
    percentualNovos,
    topClientes,
  };
}
