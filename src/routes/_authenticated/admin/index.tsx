import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Crown,
  DollarSign,
  Layers,
  MapPin,
  MessageCircle,
  PackageCheck,
  PieChart as PieIcon,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status";
import { brl, formatDateTime, maskPhone, onlyDigits, padNumero } from "@/lib/format";
import {
  calculateClientesStats,
  calculateFinanceiroStats,
  calculateRegioesStats,
  calculateStatusStats,
  type ClienteRow,
  type PedidoRow,
} from "@/lib/dashboard-analytics";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function CurrencyTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur-md">
        <p className="font-semibold text-foreground">{label || data.name}</p>
        <p className="mt-1 font-mono text-sm font-bold text-primary">
          {brl(Number(data.value || 0))}
        </p>
        {data.payload?.pedidos !== undefined && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data.payload.pedidos} {data.payload.pedidos === 1 ? "pedido" : "pedidos"}
          </p>
        )}
      </div>
    );
  }
  return null;
}

function StatusTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color || payload[0].color }} />
          <p className="font-semibold text-foreground">{item.name}</p>
        </div>
        <p className="mt-1.5 font-bold text-foreground">
          {item.value} {item.value === 1 ? "pedido" : "pedidos"} ({item.percent}%)
        </p>
        <p className="font-mono text-xs text-primary mt-0.5">
          {brl(Number(item.valor || 0))}
        </p>
        {item.sublabel && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {item.sublabel}
          </p>
        )}
      </div>
    );
  }
  return null;
}

function RegiaoTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-xs text-popover-foreground shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill || item.color }} />
          <p className="font-semibold text-foreground">{item.name}</p>
        </div>
        <p className="mt-1.5 font-bold text-foreground">
          {item.total} {item.total === 1 ? "cliente" : "clientes"} ({item.percent}%)
        </p>
      </div>
    );
  }
  return null;
}

function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [tipoGraficoFinanceiro, setTipoGraficoFinanceiro] = useState<"estagio" | "mensal">("estagio");

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", "analytics"],
    queryFn: async () => {
      const [pedidosRes, clientesRes, produtosCountRes] = await Promise.all([
        supabase
          .from("pedidos")
          .select("id, numero, status, total, total_pecas, cliente_id, cliente_nome, cliente_whatsapp, cidade, estado, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("clientes")
          .select("id, nome, email, whatsapp, cidade, estado, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("produtos")
          .select("id", { count: "exact", head: true })
          .eq("ativo", true),
      ]);

      if (pedidosRes.error) throw pedidosRes.error;
      if (clientesRes.error) throw clientesRes.error;

      const pedidos = (pedidosRes.data ?? []) as PedidoRow[];
      const clientes = (clientesRes.data ?? []) as ClienteRow[];
      const produtos = produtosCountRes.count ?? 0;

      const statusStats = calculateStatusStats(pedidos);
      const financeiroStats = calculateFinanceiroStats(pedidos);
      const regioesStats = calculateRegioesStats(clientes, pedidos);
      const clientesStats = calculateClientesStats(clientes, pedidos);

      return {
        pedidos,
        clientes,
        produtos,
        statusStats,
        financeiroStats,
        regioesStats,
        clientesStats,
        ultimos: pedidos.slice(0, 6),
      };
    },
  });

  return (
    <AdminPage title="Dashboard">
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-6 pb-20">
          {/* 1. KPIs & Balanço Geral */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Faturamento Confirmado */}
            <div className="rounded-2xl border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento Pago</span>
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {brl(data.financeiroStats.totalFaturado)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3 text-emerald-600" />
                {data.statusStats.finalizadosCount} pedidos finalizados
              </p>
            </div>

            {/* A Receber / Em Aberto */}
            <div className="rounded-2xl border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Em Aberto / Negociação</span>
                <span className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {brl(data.financeiroStats.totalPendente)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="size-3 text-blue-600" />
                {data.statusStats.emAbertoCount} carrinhos / em atendimento
              </p>
            </div>

            {/* Ticket Médio */}
            <div className="rounded-2xl border bg-card p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticket Médio</span>
                <span className="grid size-8 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Layers className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {brl(data.financeiroStats.ticketMedio)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.financeiroStats.totalPecas} peças vendidas
              </p>
            </div>

            {/* Total de Clientes */}
            <Link
              to="/admin/clientes"
              className="rounded-2xl border bg-card p-4 shadow-2xs transition hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clientes Totais</span>
                <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Users className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {data.clientesStats.totalClientes}
              </p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                +{data.clientesStats.novosUltimoMes} no último mês ({data.clientesStats.percentualNovos}%)
              </p>
            </Link>

            {/* Produtos Ativos */}
            <Link
              to="/admin/produtos"
              className="col-span-2 sm:col-span-2 lg:col-span-1 rounded-2xl border bg-card p-4 shadow-2xs transition hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catálogo Ativo</span>
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <PackageCheck className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                {data.produtos}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.pedidos.length} pedidos registrados
              </p>
            </Link>
          </div>

          {/* 2. Gráficos Principais: Pizza de Status & Barras Financeiras */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico de Pizza / Donut: Status dos Pedidos */}
            <Panel className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                      <PieIcon className="size-4" />
                    </span>
                    <div>
                      <h2 className="font-sans text-base font-bold text-foreground">Status dos Pedidos</h2>
                      <p className="text-xs text-muted-foreground">Finalizados vs. Carrinhos em Aberto vs. Não Pagos</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
                    Total: {data.statusStats.total}
                  </span>
                </div>

                {data.statusStats.total === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                    <PieIcon className="size-10 opacity-30 mb-2" />
                    <p className="text-sm font-semibold">Nenhum pedido registrado</p>
                    <p className="text-xs opacity-75">Os dados aparecerão assim que os clientes fizerem pedidos.</p>
                  </div>
                ) : (
                  <div className="pt-4">
                    <div className="h-60 w-full">
                      {mounted && (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.statusStats.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={88}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {data.statusStats.pieData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<StatusTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Legenda Customizada com Indicadores e Valores */}
                    <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-4">
                      {data.statusStats.pieData.map((item) => (
                        <div key={item.name} className="flex flex-col text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1.5">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="truncate text-xs font-semibold text-foreground">{item.name}</span>
                          </div>
                          <p className="mt-1 font-display text-lg font-bold tabular-nums text-foreground">
                            {item.value} <span className="text-xs font-normal text-muted-foreground">({item.percent}%)</span>
                          </p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {brl(item.valor)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>

            {/* Gráfico de Barras: Balanço Financeiro do Site */}
            <Panel className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <BarChart3 className="size-4" />
                    </span>
                    <div>
                      <h2 className="font-sans text-base font-bold text-foreground">Balanço Financeiro</h2>
                      <p className="text-xs text-muted-foreground">Valores confirmados vs. pendentes vs. histórico</p>
                    </div>
                  </div>

                  {/* Seletor de visualização */}
                  <div className="flex items-center rounded-xl bg-muted p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setTipoGraficoFinanceiro("estagio")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        tipoGraficoFinanceiro === "estagio"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Por Estágio
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoGraficoFinanceiro("mensal")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        tipoGraficoFinanceiro === "mensal"
                          ? "bg-card text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Evolução Mensal
                    </button>
                  </div>
                </div>

                {data.financeiroStats.totalPotencial === 0 && data.financeiroStats.totalCancelado === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                    <BarChart3 className="size-10 opacity-30 mb-2" />
                    <p className="text-sm font-semibold">Nenhum valor financeiro ainda</p>
                    <p className="text-xs opacity-75">O balanço será calculado com os pedidos realizados.</p>
                  </div>
                ) : (
                  <div className="pt-4">
                    <div className="h-60 w-full">
                      {mounted && (
                        <ResponsiveContainer width="100%" height="100%">
                          {tipoGraficoFinanceiro === "estagio" ? (
                            <BarChart data={data.financeiroStats.barrasStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                                tick={{ fontSize: 11 }}
                              />
                              <Tooltip content={<CurrencyTooltip />} />
                              <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                                {data.financeiroStats.barrasStatus.map((entry) => (
                                  <Cell key={entry.estagio} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          ) : (
                            <BarChart data={data.financeiroStats.evolucaoMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                                tick={{ fontSize: 11 }}
                              />
                              <Tooltip content={<CurrencyTooltip />} />
                              <Bar dataKey="faturado" name="Faturado" fill="#16A34A" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="aberto" name="Em Aberto" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Resumo Financeiro */}
                    <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-4 text-center">
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Total Faturado</p>
                        <p className="font-mono text-sm font-bold text-foreground sm:text-base">
                          {brl(data.financeiroStats.totalFaturado)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Em Aberto</p>
                        <p className="font-mono text-sm font-bold text-foreground sm:text-base">
                          {brl(data.financeiroStats.totalPendente)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-destructive">Cancelado</p>
                        <p className="font-mono text-sm font-bold text-foreground sm:text-base">
                          {brl(data.financeiroStats.totalCancelado)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* 3. Clientes por Região do País & Clientes Fiéis (Top Compradores) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Clientes por Região do País */}
            <Panel>
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-sans text-base font-bold text-foreground">Clientes por Região do País</h2>
                    <p className="text-xs text-muted-foreground">Distribuição nacional por macrorregiões e estados (UF)</p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {data.regioesStats.totalAnalisado} clientes
                </span>
              </div>

              {data.regioesStats.totalAnalisado === 0 ? (
                <div className="flex h-60 flex-col items-center justify-center text-center text-muted-foreground">
                  <MapPin className="size-10 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">Nenhum dado geográfico</p>
                  <p className="text-xs opacity-75">Conforme os clientes informarem o endereço, o mapa será preenchido.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                  {/* Gráfico Donut de Regiões */}
                  <div className="h-56 w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.regioesStats.regioesChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="total"
                          >
                            {data.regioesStats.regioesChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<RegiaoTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Lista de Regiões e Top UFs */}
                  <div className="flex flex-col justify-center space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Participação Regional
                    </p>
                    <ul className="space-y-2">
                      {data.regioesStats.regioesChartData.slice(0, 4).map((r) => (
                        <li key={r.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ backgroundColor: r.fill }} />
                            <span className="font-semibold text-foreground">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums font-bold text-foreground">{r.total}</span>
                            <span className="text-muted-foreground">({r.percent}%)</span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {data.regioesStats.topUFs.length > 0 && (
                      <div className="border-t border-border/50 pt-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Top Estados (UF)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {data.regioesStats.topUFs.map((u) => (
                            <span
                              key={u.uf}
                              className="inline-flex items-center gap-1 rounded-lg border bg-muted/60 px-2 py-0.5 text-xs font-semibold"
                            >
                              <span className="text-primary">{u.uf}</span>
                              <span className="tabular-nums text-muted-foreground">{u.total}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Panel>

            {/* Clientes que Mais Fazem Pedidos */}
            <Panel>
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Crown className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-sans text-base font-bold text-foreground">Top Clientes Fiéis</h2>
                    <p className="text-xs text-muted-foreground">Clientes que mais compram e geram pedidos</p>
                  </div>
                </div>
                <Link
                  to="/admin/clientes"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Ver todos <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {data.clientesStats.topClientes.length === 0 ? (
                <div className="flex h-60 flex-col items-center justify-center text-center text-muted-foreground">
                  <Award className="size-10 opacity-30 mb-2" />
                  <p className="text-sm font-semibold">Nenhum cliente com pedidos ainda</p>
                  <p className="text-xs opacity-75">O ranking de melhores clientes será listado aqui.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50 pt-2">
                  {data.clientesStats.topClientes.map((c, i) => {
                    const medalhas = ["🥇", "🥈", "🥉", "4º", "5º"];
                    const waNum = onlyDigits(c.whatsapp);
                    return (
                      <li key={c.id || c.nome} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-base select-none shrink-0 font-bold">
                            {medalhas[i] || `${i + 1}º`}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-sm text-foreground">
                              {c.nome}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.cidade && c.estado ? `${c.cidade}/${c.estado} · ` : ""}
                              <span className="font-semibold text-foreground">{c.totalPedidos}</span> {c.totalPedidos === 1 ? "pedido" : "pedidos"} ({c.totalPecas} peças)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-sm font-bold text-primary tabular-nums">
                            {brl(c.totalGasto)}
                          </span>
                          {waNum && waNum.length >= 10 && (
                            <a
                              href={`https://wa.me/55${waNum.replace(/^55/, "")}?text=${encodeURIComponent(`Olá ${c.nome}, tudo bem? Aqui é da equipe Líder Atacado!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                              title="Abrir WhatsApp do cliente"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          {/* 4. Últimos Pedidos Recentes */}
          <Panel>
            <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h2 className="font-sans text-base font-bold text-foreground">Últimos Pedidos Recebidos</h2>
                <p className="text-xs text-muted-foreground">Acompanhe os pedidos mais recentes em tempo real</p>
              </div>
              <Link to="/admin/pedidos" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Ver todos os pedidos <ArrowRight className="size-4" />
              </Link>
            </div>
            {data.ultimos.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">Nenhum pedido registrado ainda.</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {data.ultimos.map((p) => {
                  const { data: d, hora } = formatDateTime(p.created_at);
                  return (
                    <li key={p.id}>
                      <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="flex items-center gap-3 py-3 transition hover:bg-muted/30 rounded-xl px-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground">
                            #{padNumero(p.numero)} · <span className="font-normal">{p.cliente_nome}</span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {d} às {hora} · {p.total_pecas} peças · {p.cidade}/{p.estado}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-semibold tabular-nums text-sm">{brl(Number(p.total))}</span>
                          <StatusBadge status={p.status} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
