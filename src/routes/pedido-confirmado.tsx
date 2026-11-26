import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, FileDown, MessageCircle, HeartHandshake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestimonialDialog } from "@/components/store/testimonial-dialog";
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

      {/* Convite para o cliente prestar seu depoimento */}
      <section className="mt-8 rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-muted/40 p-5 text-center sm:text-left sm:flex sm:items-center sm:justify-between sm:gap-6 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>Sua Opinião Vale Muito</span>
          </div>
          <h3 className="font-bold text-base sm:text-lg text-foreground">
            Como foi sua experiência com a Líder Atacado?
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Deixe sua avaliação sobre a compra, facilidade do pedido ou conte como foi receber suas roupas no atacado. Seu depoimento ajuda outros lojistas e revendedores de todo o país!
          </p>
        </div>
        <div className="mt-4 sm:mt-0 shrink-0">
          <TestimonialDialog
            trigger={
              <Button size="default" className="w-full sm:w-auto font-bold gap-2">
                <HeartHandshake className="size-4" /> Deixar meu depoimento
              </Button>
            }
            pedidoInfo={{
              numero: p.numero,
              clienteNome: p.cliente?.nome,
              cidade: p.entrega?.cidade,
              estado: p.entrega?.estado,
            }}
          />
        </div>
      </section>

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
