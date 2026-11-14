import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lerUltimoPedido } from "@/lib/checkout-storage";
import type { PedidoCriado } from "@/lib/orders.functions";
import { padNumero } from "@/lib/format";
import { seo } from "@/lib/seo";

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
            <a href={p.waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Abrir WhatsApp
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/">Voltar à loja</Link>
          </Button>
        </div>
      </div>
      <section className="mt-10 rounded-2xl border bg-card p-5">
        <h2 className="font-sans text-lg font-bold tracking-normal">Resumo enviado</h2>
        <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed">{p.mensagem}</pre>
      </section>
    </div>
  );
}
