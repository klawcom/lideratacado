import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status";
import { brl, formatDateTime, padNumero } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const [novos, clientes, produtos, ultimos] = await Promise.all([
        supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "novo"),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("produtos").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("pedidos").select("id, numero, status, total, total_pecas, cliente_nome, cidade, estado, created_at").order("created_at", { ascending: false }).limit(8),
      ]);
      return { novos: novos.count ?? 0, clientes: clientes.count ?? 0, produtos: produtos.count ?? 0, ultimos: ultimos.data ?? [] };
    },
  });

  return (
    <AdminPage title="Dashboard">
      {isLoading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pedidos novos", value: data.novos, to: "/admin/pedidos" },
              { label: "Clientes", value: data.clientes, to: "/admin/clientes" },
              { label: "Produtos ativos", value: data.produtos, to: "/admin/produtos" },
            ].map((k) => (
              <Link key={k.label} to={k.to} className="rounded-2xl border bg-card p-4 transition hover:border-primary">
                <p className="font-display text-3xl font-bold tabular-nums">{k.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
              </Link>
            ))}
          </div>
          <Panel className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold tracking-normal">Últimos pedidos</h2>
              <Link to="/admin/pedidos" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gold-ink">
                Ver todos <ArrowRight className="size-4" />
              </Link>
            </div>
            {data.ultimos.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Nenhum pedido ainda.</p>
            ) : (
              <ul className="divide-y">
                {data.ultimos.map((p) => {
                  const { data: d, hora } = formatDateTime(p.created_at);
                  return (
                    <li key={p.id}>
                      <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="flex items-center gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            #{padNumero(p.numero)} · <span className="font-normal">{p.cliente_nome}</span>
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {d} {hora} · {p.total_pecas} peças · {p.cidade}/{p.estado}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-semibold tabular-nums">{brl(Number(p.total))}</span>
                          <StatusBadge status={p.status} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </>
      )}
    </AdminPage>
  );
}
