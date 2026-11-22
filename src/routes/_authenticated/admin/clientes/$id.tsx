import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, MessageCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminPage, FieldLabel, Loading, Panel, selectClass } from "@/components/admin/ui";
import { StatusBadge } from "@/components/admin/status";
import { UFS, brl, formatDateTime, maskCep, maskPhone, onlyDigits, padNumero, whatsappLinkNumber } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({ component: Cliente });

type C = Tables<"clientes">;
const CAMPOS: { k: keyof C; label: string; span?: string; mode?: "tel" | "numeric" | "email" }[] = [
  { k: "nome", label: "Nome", span: "sm:col-span-2" },
  { k: "email", label: "E-mail", mode: "email" },
  { k: "whatsapp", label: "WhatsApp", mode: "tel" },
  { k: "cep", label: "CEP", mode: "numeric" },
  { k: "rua", label: "Rua" },
  { k: "numero", label: "Número" },
  { k: "complemento", label: "Complemento" },
  { k: "bairro", label: "Bairro" },
  { k: "cidade", label: "Cidade" },
];

function Cliente() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const excluirFn = useServerFn(excluirClientesFn);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "cliente", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*, pedidos(id, numero, status, total, total_pecas, created_at)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState<Partial<C>>({});
  useEffect(() => {
    if (data) setF({ ...data, whatsapp: maskPhone(data.whatsapp), cep: maskCep(data.cep) });
  }, [data]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase
      .from("clientes")
      .update({
        nome: f.nome ?? "",
        email: (f.email ?? "").trim().toLowerCase(),
        whatsapp: onlyDigits(f.whatsapp ?? ""),
        cep: onlyDigits(f.cep ?? ""),
        rua: f.rua ?? "",
        numero: f.numero ?? "",
        complemento: f.complemento ?? "",
        bairro: f.bairro ?? "",
        cidade: f.cidade ?? "",
        estado: f.estado ?? "",
      })
      .eq("id", id);
    if (error) { toast.error(error.code === "23505" ? "Já existe outro cliente com esse e-mail." : error.message); return; }
    toast.success("Cliente salvo");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function confirmarExcluir() {
    if (!data) return;
    setExcluindo(true);
    try {
      await excluirFn({ data: [id] });
      toast.success(`Cliente ${data.nome} excluído com sucesso.`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      navigate({ to: "/admin/clientes" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir cliente.");
    } finally {
      setExcluindo(false);
      setDialogExcluir(false);
    }
  }

  if (isLoading || !data) return <AdminPage title="Cliente"><Loading /></AdminPage>;
  const pedidos = [...data.pedidos].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <AdminPage
      title={data.nome}
      description={`Cliente desde ${formatDateTime(data.created_at).data}${data.user_id ? " · tem conta" : ""}`}
      actions={
        <div className="flex items-center gap-2">
          {data.whatsapp && (
            <Button asChild variant="outline" size="icon" aria-label="Chamar no WhatsApp">
              <a href={`https://wa.me/${whatsappLinkNumber(data.whatsapp)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
              </a>
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDialogExcluir(true)}
            className="h-10 gap-1.5 font-medium"
          >
            <Trash2 className="size-4" /> Excluir cliente
          </Button>
        </div>
      }
    >
      <Link to="/admin/clientes" className="-mt-3 mb-3 inline-flex min-h-11 items-center gap-1 text-muted-foreground">
        <ChevronLeft className="size-5" /> Clientes
      </Link>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={salvar}>
          <Panel className="grid gap-4 sm:grid-cols-2">
            {CAMPOS.map((c) => (
              <div key={c.k} className={c.span}>
                <FieldLabel htmlFor={`c-${c.k}`}>{c.label}</FieldLabel>
                <Input
                  id={`c-${c.k}`}
                  inputMode={c.mode === "tel" ? "tel" : c.mode === "numeric" ? "numeric" : c.mode === "email" ? "email" : undefined}
                  type={c.mode === "email" ? "email" : c.mode === "tel" ? "tel" : "text"}
                  value={String(f[c.k] ?? "")}
                  onChange={(e) => {
                    const v = c.k === "whatsapp" ? maskPhone(e.target.value) : c.k === "cep" ? maskCep(e.target.value) : e.target.value;
                    setF((x) => ({ ...x, [c.k]: v }));
                  }}
                />
              </div>
            ))}
            <div>
              <FieldLabel htmlFor="c-uf">UF</FieldLabel>
              <select id="c-uf" className={selectClass} value={f.estado ?? ""} onChange={(e) => setF((x) => ({ ...x, estado: e.target.value }))}>
                <option value="">--</option>
                {UFS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">
                <Save /> Salvar
              </Button>
            </div>
          </Panel>
        </form>
        <Panel>
          <h2 className="font-sans text-lg font-bold tracking-normal">Pedidos ({pedidos.length})</h2>
          {pedidos.length === 0 ? (
            <p className="mt-2 text-muted-foreground">Nenhum pedido.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {pedidos.map((p) => (
                <li key={p.id}>
                  <Link to="/admin/pedidos/$id" params={{ id: p.id }} className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-semibold">#{padNumero(p.numero)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(p.created_at).data} · {p.total_pecas} peças · {brl(Number(p.total))}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <AlertDialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente {data.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é definitiva e removerá este cliente permanentemente do banco de dados, incluindo seus dados de contato e eventuais pedidos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExcluir}
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
              {excluindo ? "Excluindo..." : "Excluir Cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
