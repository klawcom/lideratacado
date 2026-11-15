import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { brl, formatDateTime, padNumero } from "@/lib/format";
import { tamanhosLinha } from "@/lib/whatsapp-message";
import { StatusBadge } from "@/components/admin/status";

export const Route = createFileRoute("/_authenticated/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos | Líder Atacado" },
      { name: "description", content: "Histórico dos seus pedidos na Líder Atacado." },
      { property: "og:title", content: "Meus pedidos | Líder Atacado" },
      { property: "og:description", content: "Histórico dos seus pedidos na Líder Atacado." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeusPedidos,
});

function MeusPedidos() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["me", "pedidos", user.id],
    queryFn: async () => {
      const { data: clientes } = await supabase.from("clientes").select("id").eq("user_id", user.id);
      const ids = (clientes ?? []).map((c) => c.id);
      let q = supabase
        .from("pedidos")
        .select("id, numero, status, total, total_pecas, created_at, pedido_itens(produto_nome, qtd_p, qtd_m, qtd_g, qtd_gg)")
        .order("created_at", { ascending: false });
      q = ids.length ? q.or(`user_id.eq.${user.id},cliente_id.in.(${ids.join(",")})`) : q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <h1 className="text-3xl font-extrabold">Meus pedidos</h1>
      <p className="mt-1 text-muted-foreground">{user.email}</p>
      {isLoading ? (
        <div className="mt-8 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="mt-10 rounded-2xl bg-muted p-8 text-center">
          <Package className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Você ainda não tem pedidos com este e-mail.</p>
          <Button asChild className="mt-4">
            <Link to="/">Ver produtos</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {data.map((p) => {
            const { data: d, hora } = formatDateTime(p.created_at);
            return (
              <li key={p.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display text-lg font-bold">#{padNumero(p.numero)}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {d} às {hora} · {p.total_pecas} peças
                </p>
                <ul className="mt-2 space-y-0.5 text-[15px]">
                  {p.pedido_itens.map((i, n) => (
                    <li key={n}>
                      {i.produto_nome} <span className="text-muted-foreground">— {tamanhosLinha({ p: i.qtd_p, m: i.qtd_m, g: i.qtd_g, gg: i.qtd_gg }) || "Grade personalizada"}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-semibold tabular-nums">{brl(Number(p.total))}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
