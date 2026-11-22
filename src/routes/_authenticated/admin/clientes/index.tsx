import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckSquare, Download, Loader2, Search, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Empty, Loading } from "@/components/admin/ui";
import { formatDateTime, maskCep, maskPhone, onlyDigits } from "@/lib/format";
import { excluirClientesFn } from "@/lib/clientes.functions";
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

export const Route = createFileRoute("/_authenticated/admin/clientes/")({ component: Clientes });

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Clientes() {
  const qc = useQueryClient();
  const excluirFn = useServerFn(excluirClientesFn);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [clientesParaExcluir, setClientesParaExcluir] = useState<string[] | null>(null);
  const [excluindo, setExcluindo] = useState(false);

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

  const selecting = sel !== null;
  const chosen = list.filter((c) => sel?.has(c.id)).map((c) => c.id);

  function toggleSel(id: string) {
    setSel((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (sel && sel.size === list.length && list.length > 0) {
      setSel(new Set());
    } else {
      setSel(new Set(list.map((c) => c.id)));
    }
  }

  async function executarExclusao() {
    if (!clientesParaExcluir || clientesParaExcluir.length === 0) return;
    setExcluindo(true);
    try {
      await excluirFn({ data: clientesParaExcluir });
      toast.success(
        clientesParaExcluir.length === 1
          ? "Cliente excluído com sucesso."
          : `${clientesParaExcluir.length} clientes excluídos com sucesso.`,
      );
      qc.invalidateQueries({ queryKey: ["admin"] });
      setSel(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir cliente(s).");
    } finally {
      setExcluindo(false);
      setClientesParaExcluir(null);
    }
  }

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
        <div className="flex items-center gap-2">
          {list.length > 0 && !selecting && (
            <Button variant="outline" onClick={() => setSel(new Set())} className="gap-1.5">
              <CheckSquare className="size-4" /> Selecionar
            </Button>
          )}
          <Button variant="outline" onClick={exportar} disabled={!list.length}>
            <Download className="size-4" /> CSV
          </Button>
        </div>
      }
    >
      {/* Barra de Ações em Lote */}
      {selecting && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleTodos} className="gap-1.5 font-semibold">
              {sel && sel.size === list.length && list.length > 0 ? (
                <CheckSquare className="size-4 text-primary" />
              ) : (
                <Square className="size-4" />
              )}
              {sel && sel.size === list.length ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {chosen.length} de {list.length} selecionado(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={chosen.length === 0}
              onClick={() => setClientesParaExcluir(chosen)}
              className="gap-1.5 font-bold"
            >
              <Trash2 className="size-4" /> Excluir selecionados ({chosen.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSel(null)} className="gap-1">
              <X className="size-4" /> Cancelar
            </Button>
          </div>
        </div>
      )}

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
          {list.map((c) => {
            const isSelected = sel?.has(c.id);
            return (
              <li key={c.id} className="relative">
                <div
                  className={`group block rounded-2xl border bg-card p-4 transition ${
                    isSelected ? "border-primary ring-2 ring-primary/20" : "hover:border-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selecting && (
                        <button
                          type="button"
                          onClick={() => toggleSel(c.id)}
                          className="text-foreground shrink-0"
                          aria-label={isSelected ? "Desmarcar cliente" : "Marcar cliente"}
                        >
                          {isSelected ? (
                            <CheckSquare className="size-5 text-primary" />
                          ) : (
                            <Square className="size-5 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      <Link to="/admin/clientes/$id" params={{ id: c.id }} className="min-w-0 truncate font-semibold hover:underline">
                        {c.nome}
                      </Link>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        {(c.pedidos as unknown as { count: number }[])[0]?.count ?? 0} pedidos
                      </span>
                      {!selecting && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setClientesParaExcluir([c.id]);
                          }}
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Excluir cliente"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Link to="/admin/clientes/$id" params={{ id: c.id }} className="block mt-1">
                    <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {maskPhone(c.whatsapp)} · {c.cidade}/{c.estado}
                    </p>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={clientesParaExcluir !== null}
        onOpenChange={(open) => !open && setClientesParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {clientesParaExcluir?.length === 1
                ? "Excluir este cliente?"
                : `Excluir os ${clientesParaExcluir?.length ?? 0} clientes selecionados?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é definitiva e removerá permanentemente o cadastro do(s) cliente(s)
              e eventuais pedidos vinculados do sistema.
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
                : clientesParaExcluir?.length === 1
                ? "Excluir Cliente"
                : `Excluir ${clientesParaExcluir?.length} Clientes`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
