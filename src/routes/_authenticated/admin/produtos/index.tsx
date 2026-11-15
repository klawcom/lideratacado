import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderUp, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Loading, selectClass } from "@/components/admin/ui";
import { useCategoriasAdmin } from "@/components/admin/product-form";
import { imagemPrincipal } from "@/lib/media";
import { menorPreco } from "@/lib/pricing";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({ component: Produtos });

function Produtos() {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const { data: cats } = useCategoriasAdmin();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "produtos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo_modelo, ativo, destaque, estoque, categoria_id, ordem, categorias(nome), produto_midias(tipo, url, video_externo, capa_url, ordem, principal), faixas_preco(quantidade_minima, preco_peca)")
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
  const q = busca.trim().toLowerCase();
  const list = (data ?? []).filter((p) => (!cat || p.categoria_id === cat) && (!q || p.nome.toLowerCase().includes(q) || p.codigo_modelo.toLowerCase().includes(q)));

  return (
    <AdminPage
      title="Produtos"
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/admin/produtos/importar">
              <FolderUp /> <span className="hidden sm:inline">Importar pasta</span>
            </Link>
          </Button>
          <Button asChild>
            <Link to="/admin/produtos/novo">
              <Plus /> Novo
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_16rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Buscar por nome ou código" className="pl-12" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <select className={selectClass} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {cats?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty>Nenhum produto encontrado.</Empty>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((p) => {
            const img = imagemPrincipal(p.produto_midias as never);
            const min = menorPreco(p.faixas_preco.map((f) => ({ ...f, preco_peca: Number(f.preco_peca) })));
            return (
              <li key={p.id}>
                <Link to="/admin/produtos/$id" params={{ id: p.id }} className="flex items-center gap-3 rounded-2xl border bg-card p-2 transition hover:border-primary">
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">{img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.nome}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.codigo_modelo} · {p.categorias?.nome ?? "Sem categoria"}
                    </p>
                    <p className="text-sm">
                      {min !== null ? `desde ${brl(min)}` : "sem preço"} · {p.estoque} em estoque
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 pr-2 text-xs font-semibold">
                    {!p.ativo && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Inativo</span>}
                    {p.destaque && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Destaque</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
