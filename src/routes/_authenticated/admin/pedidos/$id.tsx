import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, Panel, selectClass } from "@/components/admin/ui";
import { STATUS, StatusBadge, statusLabel, type PedidoStatus } from "@/components/admin/status";
import { brl, formatDateTime, formatWhatsappIntl, maskCep, money, padNumero, whatsappLinkNumber } from "@/lib/format";
import { tamanhosLinha } from "@/lib/whatsapp-message";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({ component: Pedido });

function Pedido() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
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

  if (isLoading || !p) return <AdminPage title="Pedido"><Loading /></AdminPage>;
  const { data: d, hora } = formatDateTime(p.created_at);
  const primeiroNome = p.cliente_nome.split(" ")[0];
  const msg = `Olá, ${primeiroNome}! Aqui é da Líder Atacado, sobre o seu pedido #${padNumero(p.numero)} (${p.total_pecas} peças, R$ ${money(Number(p.total))}). `;
  const wa = `https://wa.me/${whatsappLinkNumber(p.cliente_whatsapp)}?text=${encodeURIComponent(msg)}`;

  return (
    <AdminPage title={`Pedido #${padNumero(p.numero)}`} description={`${d} às ${hora}`}>
      <Link to="/admin/pedidos" className="-mt-3 mb-3 inline-flex min-h-11 items-center gap-1 text-muted-foreground">
        <ChevronLeft className="size-5" /> Pedidos
      </Link>
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
                  <p className="text-[15px]">Tamanhos: {tamanhosLinha({ p: i.qtd_p, m: i.qtd_m, g: i.qtd_g, gg: i.qtd_gg })}</p>
                  <p className="tabular-nums">
                    {i.qtd_p + i.qtd_m + i.qtd_g + i.qtd_gg} × {brl(Number(i.preco_unitario))} = <strong>{brl(Number(i.valor))}</strong>
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
            <h2 className="mt-3 font-sans text-base font-bold tracking-normal">Entrega</h2>
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
    </AdminPage>
  );
}
