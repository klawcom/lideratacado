import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckSquare, Eye, EyeOff, FolderInput, FolderUp, Loader2, Plus, Search, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Loading, invalidateStore, selectClass } from "@/components/admin/ui";
import { useCategoriasAdmin } from "@/components/admin/product-form";
import { excluirProdutos } from "@/lib/admin-products";
import { imagemPrincipal } from "@/lib/media";
import { menorPreco } from "@/lib/pricing";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({ component: Produtos });

const SEM = "__sem__";

function Produtos() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState<"" | "ativo" | "inativo">("");
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
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
  const list = (data ?? []).filter(
    (p) =>
      (!cat || (cat === SEM ? !p.categoria_id : p.categoria_id === cat)) &&
      (!status || (status === "ativo") === p.ativo) &&
      (!q || p.nome.toLowerCase().includes(q) || p.codigo_modelo.toLowerCase().includes(q)),
  );
  const selecting = sel !== null;
  const chosen = sel ? list.filter((p) => sel.has(p.id)).map((p) => p.id) : [];

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s ?? []);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function aplicar(fn: () => Promise<string | null>, ok: string) {
    setBusy(true);
    const err = await fn();
    setBusy(false);
    if (err) { toast.error(err); return; }
    toast.success(ok);
    setSel(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
    invalidateStore(qc);
  }

  const n = chosen.length;
  const plural = n === 1 ? "1 produto" : `${n} produtos`;

  async function visibilidade(ativo: boolean) {
    await aplicar(async () => (await supabase.from("produtos").update({ ativo }).in("id", chosen)).error?.message ?? null, ativo ? `${plural} na loja` : `${plural} ocultos`);
  }
  async function mover(categoria_id: string) {
    if (!categoria_id) return;
    const destino = categoria_id === SEM ? null : categoria_id;
    await aplicar(async () => (await supabase.from("produtos").update({ categoria_id: destino }).in("id", chosen)).error?.message ?? null, `${plural} movidos`);
  }
  async function excluir() {
    if (!confirm(`Excluir ${plural} com todas as fotos e vídeos? Isso não pode ser desfeito. Pedidos antigos continuam com o nome do produto.`)) return;
    await aplicar(async () => (await excluirProdutos(chosen)).error, `${plural} excluídos`);
  }

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
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_14rem_10rem]">
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
          <option value={SEM}>Sem categoria</option>
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrar por situação">
          <option value="">Todos</option>
          <option value="ativo">Na loja</option>
          <option value="inativo">Ocultos</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {selecting ? (
          <>
            <Button variant="outline" onClick={() => setSel(new Set(chosen.length === list.length ? [] : list.map((p) => p.id)))}>
              {chosen.length === list.length && list.length > 0 ? <CheckSquare /> : <Square />} Todos ({list.length})
            </Button>
            <Button variant="ghost" onClick={() => setSel(null)}>
              <X /> Cancelar
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setSel(new Set())} disabled={!list.length}>
            <CheckSquare /> Selecionar vários
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">{list.length} produtos</span>
      </div>

      {isLoading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty>Nenhum produto encontrado.</Empty>
      ) : (
        <ul className={`grid gap-2 md:grid-cols-2 ${selecting ? "pb-44 md:pb-28" : ""}`}>
          {list.map((p) => {
            const img = imagemPrincipal(p.produto_midias as never);
            const min = menorPreco(p.faixas_preco.map((f) => ({ ...f, preco_peca: Number(f.preco_peca) })));
            const marcado = sel?.has(p.id) ?? false;
            const inner = (
              <>
                {selecting && (marcado ? <CheckSquare className="size-6 shrink-0 text-primary" /> : <Square className="size-6 shrink-0 text-muted-foreground" />)}
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
                  {!p.ativo && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Oculto</span>}
                  {p.destaque && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Destaque</span>}
                </div>
              </>
            );
            const cls = `flex w-full items-center gap-3 rounded-2xl border bg-card p-2 text-left transition hover:border-primary ${marcado ? "border-primary ring-1 ring-primary" : ""}`;
            return (
              <li key={p.id}>
                {selecting ? (
                  <button type="button" className={cls} onClick={() => toggle(p.id)} aria-pressed={marcado}>
                    {inner}
                  </button>
                ) : (
                  <Link to="/admin/produtos/$id" params={{ id: p.id }} className={cls}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur safe-bottom md:left-64">
          <div className="mx-auto max-w-6xl px-4 pt-3 md:px-8">
            <p className="mb-2 text-sm font-medium">{n ? `${plural} selecionado${n === 1 ? "" : "s"}` : "Toque nos produtos para selecionar"}</p>
            <div className="grid grid-cols-2 gap-2 pb-3 md:flex">
              <Button variant="outline" disabled={!n || busy} onClick={() => visibilidade(true)}>
                <Eye /> Mostrar
              </Button>
              <Button variant="outline" disabled={!n || busy} onClick={() => visibilidade(false)}>
                <EyeOff /> Ocultar
              </Button>
              <div className="relative">
                <FolderInput className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <select className={`${selectClass} pl-10`} disabled={!n || busy} value="" onChange={(e) => mover(e.target.value)} aria-label="Mover para categoria">
                  <option value="">Mover para…</option>
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                  <option value={SEM}>Sem categoria</option>
                </select>
              </div>
              <Button variant="outline" className="text-destructive hover:text-destructive" disabled={!n || busy} onClick={excluir}>
                {busy ? <Loader2 className="animate-spin" /> : <Trash2 />} Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
