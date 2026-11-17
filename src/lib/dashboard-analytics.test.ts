import { describe, expect, it } from "vitest";
import {
  calculateClientesStats,
  calculateFinanceiroStats,
  calculateRegioesStats,
  calculateStatusStats,
  type ClienteRow,
  type PedidoRow,
} from "./dashboard-analytics";

describe("dashboard-analytics", () => {
  const samplePedidos: PedidoRow[] = [
    {
      id: "p1",
      numero: 1,
      status: "pago",
      total: 500,
      total_pecas: 10,
      cliente_id: "c1",
      cliente_nome: "João Silva",
      cliente_whatsapp: "5511999999999",
      cidade: "São Paulo",
      estado: "SP",
      created_at: new Date().toISOString(),
    },
    {
      id: "p2",
      numero: 2,
      status: "enviado",
      total: 1000,
      total_pecas: 20,
      cliente_id: "c1",
      cliente_nome: "João Silva",
      cliente_whatsapp: "5511999999999",
      cidade: "São Paulo",
      estado: "SP",
      created_at: new Date().toISOString(),
    },
    {
      id: "p3",
      numero: 3,
      status: "novo",
      total: 450,
      total_pecas: 10,
      cliente_id: "c2",
      cliente_nome: "Maria Santos",
      cliente_whatsapp: "5547988888888",
      cidade: "Joinville",
      estado: "SC",
      created_at: new Date().toISOString(),
    },
    {
      id: "p4",
      numero: 4,
      status: "em_atendimento",
      total: 900,
      total_pecas: 20,
      cliente_id: "c3",
      cliente_nome: "Carlos Souza",
      cliente_whatsapp: "5571977777777",
      cidade: "Salvador",
      estado: "BA",
      created_at: new Date().toISOString(),
    },
    {
      id: "p5",
      numero: 5,
      status: "cancelado",
      total: 400,
      total_pecas: 10,
      cliente_id: "c4",
      cliente_nome: "Pedro Alves",
      cliente_whatsapp: "5565966666666",
      cidade: "Cuiabá",
      estado: "MT",
      created_at: new Date().toISOString(),
    },
  ];

  const sampleClientes: ClienteRow[] = [
    {
      id: "c1",
      nome: "João Silva",
      email: "joao@exemplo.com",
      whatsapp: "5511999999999",
      cidade: "São Paulo",
      estado: "SP",
      created_at: new Date().toISOString(),
    },
    {
      id: "c2",
      nome: "Maria Santos",
      email: "maria@exemplo.com",
      whatsapp: "5547988888888",
      cidade: "Joinville",
      estado: "SC",
      created_at: new Date(Date.now() - 40 * 86400000).toISOString(), // 40 dias atrás
    },
    {
      id: "c3",
      nome: "Carlos Souza",
      email: "carlos@exemplo.com",
      whatsapp: "5571977777777",
      cidade: "Salvador",
      estado: "BA",
      created_at: new Date().toISOString(),
    },
    {
      id: "c4",
      nome: "Pedro Alves",
      email: "pedro@exemplo.com",
      whatsapp: "5565966666666",
      cidade: "Cuiabá",
      estado: "MT",
      created_at: new Date().toISOString(),
    },
  ];

  it("calcula estatísticas de status de pedidos (finalizados, em aberto e não pagos)", () => {
    const stats = calculateStatusStats(samplePedidos);
    expect(stats.total).toBe(5);
    expect(stats.finalizadosCount).toBe(2); // p1 (pago) + p2 (enviado)
    expect(stats.emAbertoCount).toBe(2); // p3 (novo) + p4 (em_atendimento)
    expect(stats.canceladosCount).toBe(1); // p5 (cancelado)

    expect(stats.finalizadosValor).toBe(1500); // 500 + 1000
    expect(stats.emAbertoValor).toBe(1350); // 450 + 900
    expect(stats.canceladosValor).toBe(400);

    expect(stats.pieData).toHaveLength(3);
    expect(stats.pieData[0]?.name).toBe("Finalizados");
    expect(stats.pieData[0]?.value).toBe(2);
    expect(stats.pieData[1]?.name).toBe("Carrinho Aberto");
    expect(stats.pieData[1]?.value).toBe(2);
    expect(stats.pieData[2]?.name).toBe("Não Pagos");
    expect(stats.pieData[2]?.value).toBe(1);
  });

  it("calcula balanço financeiro e métricas de vendas", () => {
    const fin = calculateFinanceiroStats(samplePedidos);
    expect(fin.totalFaturado).toBe(1500);
    expect(fin.totalPendente).toBe(1350);
    expect(fin.totalCancelado).toBe(400);
    expect(fin.totalPotencial).toBe(2850);
    expect(fin.ticketMedio).toBe(750); // 1500 / 2 finalizados
    expect(fin.totalPecas).toBe(30); // 10 + 20

    expect(fin.barrasStatus).toHaveLength(3);
    expect(fin.barrasStatus[0]?.valor).toBe(1500);
    expect(fin.barrasStatus[1]?.valor).toBe(1350);
    expect(fin.barrasStatus[2]?.valor).toBe(400);
  });

  it("calcula distribuição geográfica dos clientes por regiões do Brasil", () => {
    const reg = calculateRegioesStats(sampleClientes, samplePedidos);
    expect(reg.totalAnalisado).toBe(4);

    const regioes = reg.regioesChartData.map((r) => r.name);
    expect(regioes).toContain("Sudeste"); // SP
    expect(regioes).toContain("Sul"); // SC
    expect(regioes).toContain("Nordeste"); // BA
    expect(regioes).toContain("Centro-Oeste"); // MT

    expect(reg.topUFs.map((u) => u.uf)).toContain("SP");
    expect(reg.topUFs.map((u) => u.uf)).toContain("SC");
  });

  it("calcula clientes totais, clientes novos e ranking de clientes fiéis", () => {
    const cli = calculateClientesStats(sampleClientes, samplePedidos);
    expect(cli.totalClientes).toBe(4);
    expect(cli.novosUltimoMes).toBe(3); // c1, c3 e c4 foram criados hoje, c2 foi há 40 dias
    expect(cli.percentualNovos).toBe(75);

    // João Silva (c1) comprou p1 (500) e p2 (1000) = 1500, liderando o ranking
    expect(cli.topClientes[0]?.nome).toBe("João Silva");
    expect(cli.topClientes[0]?.totalPedidos).toBe(2);
    expect(cli.topClientes[0]?.totalGasto).toBe(1500);
    expect(cli.topClientes[0]?.pedidosFinalizados).toBe(2);
  });
});
