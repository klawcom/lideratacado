import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Loading } from "@/components/admin/ui";
import { formatDateTime, maskCep, maskPhone, onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/clientes/")({ component: Clientes });

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Clientes() {
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*, pedidos(count)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const q = busca.trim().toLowerCase();
  const qd = onlyDigits(busca);
  const list = (data ?? []).filter(
    (c) =>
      !q ||
      c.nome.toLowerCase().includes(q) ||
      c.email.includes(q) ||
      c.cidade.toLowerCase().includes(q) ||
      (qd.length >= 3 && c.whatsapp.includes(qd)),
  );

  function exportar() {
    const head = ["Nome", "E-mail", "WhatsApp", "Rua", "Número", "Complemento", "Bairro", "Cidade", "UF", "CEP", "Cadastro", "Pedidos"];
    const rows = list.map((c) => [
      c.nome, c.email, maskPhone(c.whatsapp), c.rua, c.numero, c.complemento, c.bairro, c.cidade, c.estado, maskCep(c.cep),
      formatDateTime(c.created_at).data, (c.pedidos as unknown as { count: number }[])[0]?.count ?? 0,
    ]);
    const csv = "\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-lider-atacado-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminPage
      title="Clientes"
      actions={
        <Button variant="outline" onClick={exportar} disabled={!list.length}>
          <Download /> CSV
        </Button>
      }
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Nome, e-mail, WhatsApp ou cidade" className="pl-12" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {isLoading ? (
        <Loading />
      ) : !list.length ? (
        <Empty>Nenhum cliente encontrado.</Empty>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link to="/admin/clientes/$id" params={{ id: c.id }} className="block rounded-2xl border bg-card p-4 transition hover:border-primary">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{c.nome}</p>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {(c.pedidos as unknown as { count: number }[])[0]?.count ?? 0} pedidos
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                <p className="text-sm text-muted-foreground">
                  {maskPhone(c.whatsapp)} · {c.cidade}/{c.estado}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}
