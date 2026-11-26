import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, MessageCircle, RefreshCw, HeartHandshake } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { TestimonialDialog } from "@/components/store/testimonial-dialog";
import { analytics } from "@/lib/analytics";
import { cart } from "@/lib/cart";
import { lerUltimoPedido } from "@/lib/checkout-storage";
import { brl, padNumero } from "@/lib/format";
import { pagamentoStatusLabel, type PagamentoStatus } from "@/lib/infinitepay";
import type { PedidoCriado } from "@/lib/orders.functions";
import { confirmarPagamentoInfinitePay, obterPagamentoCheckout } from "@/lib/payments.functions";
import { seo } from "@/lib/seo";

const searchSchema = z.object({
  order_nsu: z.string().uuid().optional(),
  transaction_nsu: z.string().max(160).optional(),
  slug: z.string().max(120).optional(),
  receipt_url: z.string().url().max(2048).optional().refine((value) => {
    if (!value) return true;
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "infinitepay.io" || url.hostname.endsWith(".infinitepay.io"));
  }),
  capture_method: z.enum(["pix", "credit_card"]).optional(),
});

export const Route = createFileRoute("/pagamento/retorno")({
  validateSearch: (input) => searchSchema.parse(input),
  head: () => ({
    meta: [
      ...seo({ title: "Pagamento do pedido | Líder Atacado", description: "Confira a situação do pagamento do seu pedido na Líder Atacado." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RetornoPagamento,
});

function RetornoPagamento() {
  const search = Route.useSearch();
  const confirmar = useServerFn(confirmarPagamentoInfinitePay);
  const obter = useServerFn(obterPagamentoCheckout);
  const [pedido, setPedido] = useState<PedidoCriado | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [status, setStatus] = useState<PagamentoStatus | "verificando" | "invalido">("verificando");
  const [numero, setNumero] = useState<number | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const iniciado = useRef(false);

  useEffect(() => {
    const ultimo = lerUltimoPedido();
    setPedido(ultimo);
    setNumero(ultimo?.numero ?? null);
    setCarregado(true);
  }, []);

  const executarVerificacao = useCallback(async () => {
    const pedidoId = search.order_nsu ?? pedido?.id;
    if (!pedidoId) {
      setStatus("invalido");
      return;
    }
    setVerificando(true);
    setErro(null);
    try {
      if (search.transaction_nsu && search.slug) {
        const result = await confirmar({
          data: {
            pedidoId,
            transactionNsu: search.transaction_nsu,
            invoiceSlug: search.slug,
            receiptUrl: search.receipt_url,
          },
        });
        setStatus(result.status);
      } else if (pedido?.id === pedidoId && pedido.checkoutKey) {
        const result = await obter({ data: { pedidoId, checkoutKey: pedido.checkoutKey } });
        setStatus(result.status);
        setNumero(result.numero);
        setPaymentUrl(result.paymentUrl);
      } else {
        setStatus("invalido");
      }
    } catch (error) {
      setStatus("erro");
      setErro(error instanceof Error ? error.message : "Não foi possível verificar o pagamento.");
    } finally {
      setVerificando(false);
    }
  }, [confirmar, obter, pedido, search.order_nsu, search.receipt_url, search.slug, search.transaction_nsu]);

  useEffect(() => {
    if (!carregado || iniciado.current) return;
    iniciado.current = true;
    void executarVerificacao();
  }, [carregado, executarVerificacao]);

  useEffect(() => {
    if (status !== "pago") return;
    cart.clear();
    if (pedido) {
      analytics.purchase({
        numero: pedido.numero,
        total: pedido.resumo.total,
        frete: pedido.frete?.preco ?? 0,
        totalPecas: pedido.resumo.totalPecas,
        itens: pedido.resumo.itens.map((item) => ({ nome: item.nome, pecas: item.pecas, valor: item.valor })),
      });
    }
  }, [pedido, status]);

  const pago = status === "pago";
  const pendente = status === "pendente" || status === "processando";
  const titulo = pago ? "Pagamento confirmado" : pendente ? "Pagamento em processamento" : status === "verificando" ? "Verificando pagamento" : status === "invalido" ? "Não foi possível identificar o pagamento" : "Pagamento ainda não confirmado";

  return (
    <div className="container-page max-w-2xl py-10 md:py-16">
      <div className="rounded-2xl border bg-card p-6 text-center md:p-8">
        {pago ? (
          <CheckCircle2 className="mx-auto size-16 text-success" />
        ) : status === "verificando" || verificando ? (
          <Loader2 className="mx-auto size-16 animate-spin text-primary" />
        ) : pendente ? (
          <Clock3 className="mx-auto size-16 text-primary" />
        ) : (
          <AlertCircle className="mx-auto size-16 text-destructive" />
        )}
        <h1 className="mt-5 text-3xl font-extrabold">{titulo}</h1>
        {numero !== null && <p className="mt-2 text-lg font-semibold">Pedido #{padNumero(numero)}</p>}
        <p className="mt-3 text-muted-foreground">
          {pago
            ? "A InfinitePay confirmou o pagamento. Seu pedido já está registrado para atendimento."
            : pendente
              ? "Assim que a InfinitePay confirmar, o status será atualizado automaticamente. Não é necessário criar outro pedido."
              : status === "verificando"
                ? "Consultando a InfinitePay com segurança. Aguarde alguns instantes."
                : status === "invalido"
                  ? "Abra o link de pagamento novamente ou fale com nosso atendimento para localizar o pedido."
                  : "O retorno ao site não confirma pagamento por si só. Verifique novamente ou fale com o atendimento."}
        </p>
        {pedido && <p className="mt-4 text-xl font-bold tabular-nums">{brl(pedido.resumo.total)}</p>}
        <p className="mt-2 text-sm font-medium">Status: {status === "verificando" || status === "invalido" ? titulo : pagamentoStatusLabel(status)}</p>
        {erro && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!pago && status !== "verificando" && status !== "invalido" && (
            <Button onClick={() => void executarVerificacao()} disabled={verificando} size="lg">
              <RefreshCw className={verificando ? "animate-spin" : ""} /> Verificar novamente
            </Button>
          )}
          {pago && search.receipt_url && (
            <Button asChild size="lg">
              <a href={search.receipt_url} target="_blank" rel="noopener noreferrer">Ver comprovante</a>
            </Button>
          )}
          {pendente && paymentUrl && (
            <Button asChild size="lg">
              <a href={paymentUrl}>Voltar ao pagamento</a>
            </Button>
          )}
          {pedido?.waUrl && (
            <Button asChild variant="outline" size="lg">
              <a href={pedido.waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle /> Falar sobre o pedido</a>
            </Button>
          )}
          <Button asChild variant="ghost" size="lg">
            <Link to="/">Voltar à loja</Link>
          </Button>
        </div>

        {pago && (
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Gostaria de compartilhar sua avaliação sobre a sua experiência na Líder Atacado?
            </p>
            <TestimonialDialog
              trigger={
                <Button variant="outline" className="gap-2 font-semibold">
                  <HeartHandshake className="size-4 text-primary" /> Deixar meu depoimento
                </Button>
              }
              pedidoInfo={{
                numero: numero ?? undefined,
                clienteNome: pedido?.cliente?.nome,
                cidade: pedido?.entrega?.cidade,
                estado: pedido?.entrega?.estado,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
