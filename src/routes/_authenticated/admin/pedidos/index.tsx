import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { AdminPage, Empty, Loading, selectClass } from "@/components/admin/ui";
import { STATUS, StatusBadge, type PedidoStatus } from "@/components/admin/status";
import { brl, formatDateTime, padNumero } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/pedidos/")({ component: Pedidos });

function Pedidos() {
  const [status, setStatus] = useState<"" | PedidoStatus>("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pedidos", status, de, ate],
    queryFn: async () => {
      let q = supabase
        .from("pedidos")
        .select("id, numero, status, total, total_pecas, cliente_nome, cliente_whatsapp, cidade, estado, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (status) q = q.eq("status", status);
      if (de) q = q.gte("created_at", new Date(`${de}T00:00:00-04:00`).toISOString());
      if (ate) q = q.lte("created_at", new Date(`${ate}T23:59:59-04:00`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminPage title="Pedidos">
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[14rem_1fr_1fr]">
        <select className={`${selectClass} col-span-2 md:col-span-1`} value={status} onChange={(e) => setStatus(e.target.value as PedidoStatus | "")} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="text-sm">
          <span className="text-muted-foreground">De</span>
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Até</span>
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
      </div>
      {isLoading ? (
        <Loading />
      ) : !data?.length ? (
        <Empty>Nenhum pedido encontrado.</Empty>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {data.map((p) => {
              const { data: d, hora } = formatDateTime(p.created_at);
              return (
                <li key={p.id}>
                  <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="block rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-lg font-bold">#{padNumero(p.numero)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 font-medium">{p.cliente_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {d} {hora} · {p.cidade}/{p.estado}
                    </p>
                    <p className="mt-1 tabular-nums">
                      {p.total_pecas} peças · <strong>{brl(Number(p.total))}</strong>
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <table className="w-full text-left">
              <thead className="border-b text-sm text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Nº</th>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Cidade</th>
                  <th className="p-3 text-right font-medium">Peças</th>
                  <th className="p-3 text-right font-medium">Total</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((p) => {
                  const { data: d, hora } = formatDateTime(p.created_at);
                  return (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="p-3 font-semibold">
                        <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="hover:text-gold-ink">
                          #{padNumero(p.numero)}
                        </Link>
                      </td>
                      <td className="p-3 text-sm">
                        {d} {hora}
                      </td>
                      <td className="p-3">
                        <Link to="/admin/pedidos/$id" params={{ id: p.id }}>
                          {p.cliente_nome}
                        </Link>
                      </td>
                      <td className="p-3 text-sm">
                        {p.cidade}/{p.estado}
                      </td>
                      <td className="p-3 text-right tabular-nums">{p.total_pecas}</td>
                      <td className="p-3 text-right font-semibold tabular-nums">{brl(Number(p.total))}</td>
                      <td className="p-3">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPage>
  );
}
