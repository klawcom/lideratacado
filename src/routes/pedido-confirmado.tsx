import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, FileDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lerUltimoPedido } from "@/lib/checkout-storage";
import type { PedidoCriado } from "@/lib/orders.functions";
import { padNumero } from "@/lib/format";
import { gerarPedidoPdf } from "@/lib/order-pdf";
import { seo } from "@/lib/seo";
import { analytics } from "@/lib/analytics";

export const Route = createFileRoute("/pedido-confirmado")({
  head: () => ({
    meta: [
      ...seo({ title: "Pedido enviado | Líder Atacado", description: "Seu pedido foi registrado e enviado para o WhatsApp da Líder Atacado." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Confirmado,
});

function Confirmado() {
  const [p, setP] = useState<PedidoCriado | null | undefined>(undefined);
  useEffect(() => setP(lerUltimoPedido()), []);

  function baixarPdf() {
    if (!p) return;
    if (p.cliente && p.entrega) {
      gerarPedidoPdf({
        numero: p.numero,
        criadoEm: p.criadoEm,
        statusLabel: "Registrado",
        cliente: p.cliente,
        entrega: p.entrega,
        itens: p.resumo.itens.map((it) => ({
          nome: it.nome,
          codigo: it.codigo,
          pecas: it.pecas,
          preco: it.preco,
          valor: it.valor,
          detalhes: it.observacao,
        })),
        resumo: {
          totalPecas: p.resumo.totalPecas,
          faixa: p.resumo.faixa,
          total: p.resumo.total,
        },
        frete: p.frete,
        observacao: p.observacao,
      });
    } else {
      gerarPedidoPdf({
        numero: p.numero,
        criadoEm: p.criadoEm,
        statusLabel: "Registrado",
        cliente: { nome: "Cliente", email: "", whatsapp: "" },
        entrega: { rua: "", numero: "", bairro: "", cidade: "", estado: "", cep: "" },
        itens:
          p.resumo?.itens?.map((it) => ({
            nome: it.nome,
            codigo: it.codigo,
            pecas: it.pecas,
            preco: it.preco,
            valor: it.valor,
          })) ?? [],
        resumo: {
          totalPecas: p.resumo?.totalPecas ?? 0,
          faixa: p.resumo?.faixa ?? 10,
          total: p.resumo?.total ?? 0,
        },
        observacao: p.mensagem,
      });
    }
  }

  if (p === undefined) return <div className="min-h-[50vh]" />;
  if (!p) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Nenhum pedido recente</h1>
        <Button asChild className="mt-6">
          <Link to="/">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-8 md:py-14">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-3xl font-extrabold">Pedido #{padNumero(p.numero)} registrado</h1>
        <p className="mt-2 text-muted-foreground">
          Envie a mensagem no WhatsApp para concluir. Vamos responder com o frete e as formas de pagamento.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <a
              href={p.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => analytics.clickWhatsApp("confirmado", { numero: p.numero })}
            >
              <MessageCircle /> Abrir WhatsApp
            </a>
          </Button>
          <Button size="lg" variant="outline" onClick={baixarPdf} className="gap-2">
            <FileDown className="size-4" /> Baixar Pedido (PDF)
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/">Voltar à loja</Link>
          </Button>
        </div>
      </div>
      <section className="mt-10 rounded-2xl border bg-card p-5">
        <h2 className="font-sans text-lg font-bold tracking-normal">Resumo enviado</h2>
        <div className="mt-3 space-y-0.5 break-words text-[15px] leading-relaxed">
          {p.mensagem.split("\n").map((line, i) =>
            line.trim() === "" ? (
              <div key={i} className="h-3" />
            ) : (
              <p key={i}>
                {line.split(/(\*[^*]+\*)/g).map((part, j) =>
                  part.startsWith("*") && part.endsWith("*") && part.length > 2 ? <strong key={j}>{part.slice(1, -1)}</strong> : part,
                )}
              </p>
            ),
          )}
        </div>
      </section>
    </div>
  );
}
