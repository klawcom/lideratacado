import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckSquare, Loader2, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminPage, Empty, Loading, selectClass } from "@/components/admin/ui";
import { STATUS, StatusBadge, type PedidoStatus } from "@/components/admin/status";
import { brl, formatDateTime, padNumero } from "@/lib/format";
import { excluirPedidosFn } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/admin/pedidos/")({ component: Pedidos });

function Pedidos() {
  const qc = useQueryClient();
  const excluirFn = useServerFn(excluirPedidosFn);
  const [status, setStatus] = useState<"" | PedidoStatus>("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const [sel, setSel] = useState<Set<string> | null>(null);
  const [pedidosParaExcluir, setPedidosParaExcluir] = useState<string[] | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pedidos", status, de, ate],
    queryFn: async () => {
      let q = supabase
        .from("pedidos")
        .select("id, numero, status, total, total_pecas, cliente_nome, cliente_whatsapp, cidade, estado, observacao, created_at")
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

  const selecting = sel !== null;
  const lista = data ?? [];
  const chosen = sel ? lista.filter((p) => sel.has(p.id)).map((p) => p.id) : [];

  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s ?? []);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleTodos() {
    if (!sel || sel.size < lista.length) {
      setSel(new Set(lista.map((p) => p.id)));
    } else {
      setSel(new Set());
    }
  }

  async function executarExclusao() {
    if (!pedidosParaExcluir || pedidosParaExcluir.length === 0) return;
    setExcluindo(true);
    try {
      await excluirFn({ data: pedidosParaExcluir });
      toast.success(
        pedidosParaExcluir.length === 1
          ? "Pedido excluído com sucesso."
          : `${pedidosParaExcluir.length} pedidos excluídos com sucesso.`,
      );
      qc.invalidateQueries({ queryKey: ["admin"] });
      setSel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir pedido(s).");
    } finally {
      setExcluindo(false);
      setPedidosParaExcluir(null);
    }
  }

  return (
    <AdminPage title="Pedidos">
      {/* Barra de Ações em Lote */}
      {selecting ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleTodos} className="gap-1.5 font-semibold">
              {sel && sel.size === lista.length && lista.length > 0 ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4" />
              )}
              {sel && sel.size === lista.length ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {chosen.length} de {lista.length} selecionado(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={chosen.length === 0}
              onClick={() => setPedidosParaExcluir(chosen)}
              className="gap-1.5 font-bold"
            >
              <Trash2 className="size-4" /> Excluir selecionados ({chosen.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSel(null)} className="gap-1">
              <X className="size-4" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {lista.length} pedido(s) encontrado(s)
          </div>
          {lista.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSel(new Set())}
              className="gap-1.5"
            >
              <CheckSquare className="size-4" /> Selecionar pedidos
            </Button>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-[14rem_1fr_1fr]">
        <select
          className={`${selectClass} col-span-2 md:col-span-1`}
          value={status}
          onChange={(e) => setStatus(e.target.value as PedidoStatus | "")}
          aria-label="Filtrar por status"
        >
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
      ) : !lista.length ? (
        <Empty>Nenhum pedido encontrado.</Empty>
      ) : (
        <>
          {/* Visualização Mobile (Cards) */}
          <ul className="space-y-2 md:hidden">
            {lista.map((p) => {
              const { data: d, hora } = formatDateTime(p.created_at);
              const isDrop = Boolean(p.observacao && p.observacao.includes("[DROPSHIPPING]"));
              const isChecked = sel?.has(p.id);

              return (
                <li
                  key={p.id}
                  className={`relative rounded-2xl border bg-card p-4 transition ${
                    isChecked ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {selecting && (
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-primary"
                        >
                          {isChecked ? <CheckSquare className="size-5" /> : <Square className="size-5 text-muted-foreground" />}
                        </button>
                      )}
                      <div>
                        <Link
                          to="/admin/pedidos/$id"
                          params={{ id: p.id }}
                          className="font-display text-lg font-bold hover:text-gold-ink"
                        >
                          #{padNumero(p.numero)}
                        </Link>
                        {isDrop && (
                          <span className="ml-2 rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            Drop
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="mt-2 block">
                    <p className="font-medium text-foreground">{p.cliente_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {d} {hora} · {p.cidade}/{p.estado}
                    </p>
                    <p className="mt-1 tabular-nums">
                      {p.total_pecas} peças · <strong>{brl(Number(p.total))}</strong>
                    </p>
                  </Link>

                  {!selecting && (
                    <div className="mt-3 flex justify-end border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPedidosParaExcluir([p.id])}
                        className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" /> Excluir
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Visualização Desktop (Tabela) */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <table className="w-full text-left">
              <thead className="border-b text-sm text-muted-foreground">
                <tr>
                  {selecting && (
                    <th className="w-10 p-3 text-center">
                      <button
                        type="button"
                        onClick={toggleTodos}
                        className="flex size-6 items-center justify-center rounded"
                        title={sel && sel.size === lista.length ? "Desmarcar todos" : "Selecionar todos"}
                      >
                        {sel && sel.size === lista.length && lista.length > 0 ? (
                          <CheckSquare className="size-4 text-primary" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="p-3 font-medium">Nº</th>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Cidade/UF</th>
                  <th className="p-3 text-right font-medium">Peças</th>
                  <th className="p-3 text-right font-medium">Total</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lista.map((p) => {
                  const { data: d, hora } = formatDateTime(p.created_at);
                  const isDrop = Boolean(p.observacao && p.observacao.includes("[DROPSHIPPING]"));
                  const isChecked = sel?.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-muted/50 ${isChecked ? "bg-primary/5" : ""}`}
                    >
                      {selecting && (
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggle(p.id)}
                            className="flex size-6 items-center justify-center rounded text-primary"
                          >
                            {isChecked ? <CheckSquare className="size-4" /> : <Square className="size-4 text-muted-foreground" />}
                          </button>
                        </td>
                      )}
                      <td className="p-3 font-semibold">
                        <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="hover:text-gold-ink">
                          #{padNumero(p.numero)}
                        </Link>
                        {isDrop && (
                          <span className="ml-1.5 rounded-full bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                            Drop
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {d} {hora}
                      </td>
                      <td className="p-3">
                        <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="font-medium hover:underline">
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
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs font-semibold">
                            <Link to="/admin/pedidos/$id" params={{ id: p.id }}>
                              Ver
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPedidosParaExcluir([p.id])}
                            className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Excluir pedido"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={pedidosParaExcluir !== null}
        onOpenChange={(open) => !open && setPedidosParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pedidosParaExcluir?.length === 1
                ? "Excluir este pedido?"
                : `Excluir os ${pedidosParaExcluir?.length ?? 0} pedidos selecionados?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não poderá ser desfeita. Todos os dados dos pedidos
              selecionados (incluindo cobranças, itens e notas) serão removidos do sistema.
              As estatísticas e balanços do painel serão atualizados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executarExclusao}
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {excluindo
                ? "Excluindo..."
                : pedidosParaExcluir?.length === 1
                ? "Excluir Pedido"
                : `Excluir ${pedidosParaExcluir?.length} Pedidos`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
