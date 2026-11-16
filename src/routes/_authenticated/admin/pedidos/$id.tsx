import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ChevronLeft, FileDown, Loader2, MessageCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, Panel, selectClass } from "@/components/admin/ui";
import { STATUS, StatusBadge, statusLabel, type PedidoStatus } from "@/components/admin/status";
import { brl, formatDateTime, formatWhatsappIntl, maskCep, money, padNumero, whatsappLinkNumber } from "@/lib/format";
import { tamanhosLinha } from "@/lib/whatsapp-message";
import { excluirPedidosFn } from "@/lib/orders.functions";
import { gerarPedidoPdf } from "@/lib/order-pdf";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({ component: Pedido });

function Pedido() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const excluirFn = useServerFn(excluirPedidosFn);
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const { data: p, isLoading } = useQuery({
    queryKey: ["admin", "pedido", id],
    queryFn: async () => {
      const [{ data, error }, { data: nota }] = await Promise.all([
        supabase.from("pedidos").select("*, pedido_itens(*)").eq("id", id).single(),
        supabase.from("pedido_notas").select("notas").eq("pedido_id", id).maybeSingle(),
      ]);
      if (error) throw error;
      return { ...data, notas: nota?.notas ?? "" };
    },
  });
  const [notas, setNotas] = useState("");
  useEffect(() => setNotas(p?.notas ?? ""), [p?.notas]);

  async function mudarStatus(status: PedidoStatus) {
    const { error } = await supabase.from("pedidos").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Status: ${statusLabel(status)}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }
  async function salvarNotas() {
    const { error } = await supabase.from("pedido_notas").upsert({ pedido_id: id, notas, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success("Notas salvas");
    qc.invalidateQueries({ queryKey: ["admin", "pedido", id] });
  }

  function baixarPdf() {
    if (!p) return;
    const isDrop = p.observacao?.includes("[DROPSHIPPING]");
    gerarPedidoPdf({
      numero: p.numero,
      criadoEm: p.created_at,
      statusLabel: statusLabel(p.status),
      cliente: {
        nome: p.cliente_nome,
        email: p.cliente_email,
        whatsapp: p.cliente_whatsapp,
      },
      entrega: {
        rua: p.rua,
        numero: p.numero_endereco,
        complemento: p.complemento,
        bairro: p.bairro,
        cidade: p.cidade,
        estado: p.estado,
        cep: p.cep,
        isDropshipping: isDrop,
      },
      itens: p.pedido_itens.map((i) => ({
        nome: i.produto_nome,
        codigo: i.codigo_modelo,
        pecas:
          (i.qtd_p + i.qtd_m + i.qtd_g + i.qtd_gg) ||
          (Number(i.preco_unitario) > 0 ? Math.round(Number(i.valor) / Number(i.preco_unitario)) : 0),
        preco: Number(i.preco_unitario),
        valor: Number(i.valor),
        detalhes: tamanhosLinha({ p: i.qtd_p, m: i.qtd_m, g: i.qtd_g, gg: i.qtd_gg }) || i.observacao,
        observacao: i.observacao,
      })),
      resumo: {
        totalPecas: p.total_pecas,
        faixa: p.faixa_aplicada,
        total: Number(p.total),
      },
      observacao: p.observacao,
      notasInternas: p.notas,
    });
  }

  async function confirmarExcluir() {
    if (!p) return;
    setExcluindo(true);
    try {
      await excluirFn({ data: [id] });
      toast.success(`Pedido #${padNumero(p.numero)} excluído com sucesso.`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      navigate({ to: "/admin/pedidos" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir pedido.");
    } finally {
      setExcluindo(false);
      setDialogExcluir(false);
    }
  }

  if (isLoading || !p) return <AdminPage title="Pedido"><Loading /></AdminPage>;
  const { data: d, hora } = formatDateTime(p.created_at);
  const primeiroNome = p.cliente_nome.split(" ")[0];
  const msg = `Olá, ${primeiroNome}! Aqui é da Líder Atacado, sobre o seu pedido #${padNumero(p.numero)} (${p.total_pecas} peças, R$ ${money(Number(p.total))}). `;
  const wa = `https://wa.me/${whatsappLinkNumber(p.cliente_whatsapp)}?text=${encodeURIComponent(msg)}`;
  const isDrop = Boolean(p.observacao && p.observacao.includes("[DROPSHIPPING]"));

  return (
    <AdminPage title={`Pedido #${padNumero(p.numero)}`} description={`${d} às ${hora}`}>
      <div className="-mt-3 mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/pedidos" className="inline-flex min-h-11 items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" /> Pedidos
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={baixarPdf} className="h-10 gap-1.5 font-medium">
            <FileDown className="size-4" /> Baixar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogExcluir(true)}
            className="h-10 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" /> Excluir Pedido
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-sans text-lg font-bold tracking-normal">Itens</h2>
              <StatusBadge status={p.status} />
            </div>
            <ul className="mt-2 divide-y">
              {p.pedido_itens.map((i, n) => (
                <li key={i.id} className="py-3">
                  <p className="font-semibold">
                    {n + 1}) {i.produto_nome} <span className="font-normal text-muted-foreground">{i.codigo_modelo}</span>
                  </p>
                  <p className="text-[15px]">Tamanhos: {tamanhosLinha({ p: i.qtd_p, m: i.qtd_m, g: i.qtd_g, gg: i.qtd_gg }) || (i.observacao ? "Conforme detalhado abaixo" : "Padrão")}</p>
                  <p className="tabular-nums">
                    {(i.qtd_p + i.qtd_m + i.qtd_g + i.qtd_gg) || (Number(i.preco_unitario) > 0 ? Math.round(Number(i.valor) / Number(i.preco_unitario)) : 0)} × {brl(Number(i.preco_unitario))} = <strong>{brl(Number(i.valor))}</strong>
                  </p>
                  {i.observacao && <p className="mt-1 rounded-xl bg-muted px-3 py-2 text-sm">📝 {i.observacao}</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total de peças</dt>
                <dd className="font-semibold">{p.total_pecas}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Faixa aplicada</dt>
                <dd className="font-semibold">a partir de {p.faixa_aplicada}</dd>
              </div>
              <div className="flex justify-between text-lg">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold tabular-nums">{brl(Number(p.total))}</dd>
              </div>
            </dl>
            {p.observacao && (
              <div className="mt-3 rounded-xl bg-accent p-3 text-accent-foreground">
                <p className="text-sm font-semibold">Observação do pedido</p>
                <p className="whitespace-pre-line">{p.observacao}</p>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <label htmlFor="st" className="mb-1.5 block font-semibold">
              Status
            </label>
            <select id="st" className={selectClass} value={p.status} onChange={(e) => mudarStatus(e.target.value as PedidoStatus)}>
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button asChild className="mt-3 w-full">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Chamar no WhatsApp
              </a>
            </Button>
          </Panel>
          <Panel>
            <h2 className="font-sans text-base font-bold tracking-normal">Cliente</h2>
            <p className="mt-1 font-medium">{p.cliente_nome}</p>
            <p className="break-all text-muted-foreground">{p.cliente_email}</p>
            <p className="text-muted-foreground">{formatWhatsappIntl(p.cliente_whatsapp)}</p>
            {p.cliente_id && (
              <Link to="/admin/clientes/$id" params={{ id: p.cliente_id }} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-gold-ink">
                Ver ficha do cliente
              </Link>
            )}
            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
              <h2 className="font-sans text-base font-bold tracking-normal">Entrega</h2>
              {isDrop && (
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 text-xs font-bold text-blue-800 dark:text-blue-300">
                  📦 Dropshipping
                </span>
              )}
            </div>
            <p className="mt-1">
              {p.rua}, {p.numero_endereco} {p.complemento}
              <br />
              {p.bairro}
              <br />
              {p.cidade}/{p.estado}
              <br />
              CEP {maskCep(p.cep)}
            </p>
          </Panel>
          <Panel>
            <label htmlFor="notas" className="mb-1.5 block font-semibold">
              Notas internas <span className="font-normal text-muted-foreground">(só você vê)</span>
            </label>
            <Textarea id="notas" rows={4} value={notas} onChange={(e) => setNotas(e.target.value)} />
            <Button variant="outline" className="mt-2 w-full" onClick={salvarNotas} disabled={notas === p.notas}>
              <Save /> Salvar notas
            </Button>
          </Panel>
        </div>
      </div>

      <AlertDialog open={dialogExcluir} onOpenChange={setDialogExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido #{padNumero(p.numero)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é definitiva e removerá este pedido de teste permanentemente do banco de dados, incluindo seus itens e notas internas. Os relatórios financeiros e contadores do painel serão recalculados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExcluir}
              disabled={excluindo}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {excluindo ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              {excluindo ? "Excluindo..." : "Excluir Pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
