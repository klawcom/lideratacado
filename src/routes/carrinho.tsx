import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Pencil, ShoppingBag, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QtyStepper } from "@/components/store/qty-stepper";
import { StickyBar } from "@/components/store/sticky-bar";
import { cart, useCart, type CartItem } from "@/lib/cart";
import { calcularPedido, TAMANHOS } from "@/lib/pricing";
import { brl, money } from "@/lib/format";
import { getProdutosPorIds, siteQuery } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { tamanhosLinha } from "@/lib/whatsapp-message";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      ...seo({ title: "Seu pedido | Líder Atacado", description: "Revise as peças, tamanhos e valores do seu pedido no atacado." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CarrinhoPage,
});

/** Keeps cart names/prices in sync with the catalog (changes in the panel show up right away). */
export function useSyncCart(items: CartItem[]) {
  const ids = useMemo(() => items.map((i) => i.produtoId).sort(), [items]);
  const { data } = useQuery({
    queryKey: ["cart-sync", ids],
    queryFn: () => getProdutosPorIds({ data: { ids } }),
    enabled: ids.length > 0,
  });
  useEffect(() => {
    if (!data) return;
    const byId = new Map(data.map((p) => [p.id, p]));
    for (const it of cart.get()) {
      const p = byId.get(it.produtoId);
      if (!p) continue;
      const next = { nome: p.nome, slug: p.slug, codigo: p.codigo_modelo, imagem: imagemPrincipal(p.produto_midias), faixas: p.faixas_preco };
      if (JSON.stringify(next) !== JSON.stringify({ nome: it.nome, slug: it.slug, codigo: it.codigo, imagem: it.imagem, faixas: it.faixas })) {
        cart.update(it.produtoId, next);
      }
    }
  }, [data]);
  return data ? new Set(data.map((p) => p.id)) : null;
}

function CarrinhoPage() {
  const items = useCart();
  const navigate = useNavigate();
  const { data: site } = useQuery(siteQuery());
  const minimo = site?.config?.pedido_minimo ?? 10;
  const disponiveis = useSyncCart(items);
  const indisponiveis = disponiveis ? items.filter((i) => !disponiveis.has(i.produtoId)) : [];
  const resumo = calcularPedido(items, minimo);
  const [editando, setEditando] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-20 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-muted">
          <ShoppingBag className="size-7 text-muted-foreground" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">Seu pedido está vazio</h1>
        <p className="mt-2 text-muted-foreground">Escolha os produtos e as quantidades por tamanho.</p>
        <Button asChild className="mt-6">
          <Link to="/">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page pb-bar pt-6 md:pt-10">
      <h1 className="text-3xl font-extrabold">Seu pedido</h1>
      <p className="mt-1 text-lg">
        <strong className="tabular-nums">{resumo.totalPecas}</strong> peças no pedido
      </p>

      <div className="mt-4 space-y-2">
        {resumo.faltamMinimo > 0 && (
          <p className="rounded-2xl bg-destructive/10 p-4 font-medium text-destructive">
            Faltam {resumo.faltamMinimo} peças para o pedido mínimo de {minimo} peças.
          </p>
        )}
        {resumo.proxima && resumo.faltamMinimo === 0 && (
          <p className="flex gap-2 rounded-2xl bg-accent p-4 font-medium text-accent-foreground">
            <TrendingDown className="mt-0.5 size-5 shrink-0" />
            Faltam {resumo.proxima.faltam} peças para a faixa de {resumo.proxima.faixa} peças, com preço menor em todos os itens.
          </p>
        )}
        {indisponiveis.length > 0 && (
          <p className="rounded-2xl bg-destructive/10 p-4 font-medium text-destructive">
            {indisponiveis.map((i) => i.nome).join(", ")} não {indisponiveis.length > 1 ? "estão" : "está"} mais disponível. Remova para continuar.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-3">
          {resumo.itens.map((it) => (
            <li key={it.produtoId} className="rounded-2xl border bg-card p-3 sm:p-4">
              <div className="flex gap-3">
                <Link to="/produto/$slug" params={{ slug: it.slug }} className="size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24">
                  {it.imagem && <img src={it.imagem} alt={it.nome} loading="lazy" className="h-full w-full object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/produto/$slug" params={{ slug: it.slug }} className="line-clamp-2 font-semibold leading-snug">
                    {it.nome}
                  </Link>
                  <p className="text-sm text-muted-foreground">{tamanhosLinha(it.qtd) || "Sem peças"}</p>
                  <p className="mt-1 text-sm tabular-nums">
                    {it.pecas} × R$ {money(it.preco)} = <strong>{brl(it.valor)}</strong>
                  </p>
                </div>
              </div>
              {it.observacao && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">📝 {it.observacao}</p>}
              {it.precoProxima !== null && it.precoProxima < it.preco && resumo.proxima && (
                <p className="mt-2 text-sm font-medium text-gold-ink">
                  Faltam {resumo.proxima.faltam} peças para o preço de R$ {money(it.precoProxima)} por peça
                </p>
              )}

              {editando === it.produtoId ? (
                <EditItem item={it} onDone={() => setEditando(null)} />
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditando(it.produtoId)}>
                    <Pencil /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={() => cart.remove(it.produtoId)}>
                    <Trash2 /> Remover
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="font-sans text-lg font-bold tracking-normal">Resumo</h2>
          <dl className="mt-3 space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total de peças</dt>
              <dd className="font-semibold tabular-nums">{resumo.totalPecas}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Faixa de preço</dt>
              <dd className="font-semibold">a partir de {resumo.faixa}</dd>
            </div>
            <div className="flex justify-between border-t pt-3 text-lg">
              <dt className="font-semibold">Total dos produtos</dt>
              <dd className="font-bold tabular-nums">{brl(resumo.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-sm text-muted-foreground">Frete e pagamento a combinar pelo WhatsApp.</p>
          <Button variant="link" asChild className="mt-2 px-0">
            <Link to="/">Continuar escolhendo</Link>
          </Button>
        </aside>
      </div>

      <StickyBar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-lg font-bold tabular-nums">{brl(resumo.total)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {resumo.faltamMinimo > 0 ? `Faltam ${resumo.faltamMinimo} peças` : `${resumo.totalPecas} peças`}
          </p>
        </div>
        <Button
          size="lg"
          className="shrink-0"
          disabled={!resumo.podeFinalizar || indisponiveis.length > 0}
          onClick={() => navigate({ to: "/finalizar" })}
        >
          Finalizar pedido <ArrowRight />
        </Button>
      </StickyBar>
    </div>
  );
}

function EditItem({ item, onDone }: { item: CartItem; onDone: () => void }) {
  const [qtd, setQtd] = useState(item.qtd);
  const [obs, setObs] = useState(item.observacao);
  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {TAMANHOS.map((t) => (
          <QtyStepper key={t.key} compact label={t.label} value={qtd[t.key]} onChange={(v) => setQtd((q) => ({ ...q, [t.key]: v }))} />
        ))}
      </div>
      <Textarea
        aria-label="Observação do item"
        maxLength={300}
        rows={2}
        value={obs}
        onChange={(e) => setObs(e.target.value.slice(0, 300))}
        placeholder="Observação do item (opcional)"
      />
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            if (qtd.p + qtd.m + qtd.g + qtd.gg === 0) cart.remove(item.produtoId);
            else cart.update(item.produtoId, { qtd, observacao: obs.trim() });
            onDone();
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
