import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useSyncCart } from "@/lib/use-sync-cart";
import { useState } from "react";
import { ArrowRight, Pencil, ShoppingBag, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QtyStepper } from "@/components/store/qty-stepper";
import { ProgressDiscount } from "@/components/store/progress-discount";
import { cart, useCart, type CartItem } from "@/lib/cart";
import {
  calcularPedido,
  pecas,
  TAMANHOS,
  TAMANHOS_PADRAO,
  TAMANHOS_PLUS_SIZE,
  type Qtd,
} from "@/lib/pricing";
import { brl, faltamPecas, money } from "@/lib/format";
import { siteQuery } from "@/lib/catalog.functions";
import { tamanhosLinha } from "@/lib/whatsapp-message";
import { formatarCorTamanhos } from "@/lib/colors";
import { ShippingCalculator } from "@/components/store/shipping-calculator";
import { seo } from "@/lib/seo";
import { analytics } from "@/lib/analytics";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      ...seo({ title: "Seu pedido | Líder Atacado", description: "Revise as peças, tamanhos e valores do seu pedido no atacado." }),
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CarrinhoPage,
});

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
    <div className="container-page pt-6 md:pt-10">
      <h1 className="text-3xl font-extrabold">Seu pedido</h1>
      <p className="mt-1 text-lg">
        <strong className="tabular-nums">{resumo.totalPecas}</strong> peças no pedido
      </p>

      <ProgressDiscount
        totalPecas={resumo.totalPecas}
        pedidoMinimo={minimo}
        faixaAtual={resumo.faixa}
        proxima={resumo.proxima}
        className="mt-4"
      />

      {indisponiveis.length > 0 && (
        <div className="mt-3">
          <p className="rounded-2xl bg-destructive/10 p-4 font-medium text-destructive">
            {indisponiveis.map((i) => i.nome).join(", ")} não {indisponiveis.length > 1 ? "estão" : "está"} mais disponível. Remova para continuar.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-3">
          {resumo.itens.map((it) => (
            <li key={it.produtoId} className="rounded-2xl border bg-card p-3 sm:p-4">
              <div className="flex gap-3">
                <Link to="/produto/$slug" params={{ slug: it.slug }} className="w-16 sm:w-20 aspect-[4/5] shrink-0 overflow-hidden rounded-xl bg-muted">
                  {it.imagem && <img src={it.imagem} alt={it.nome} loading="lazy" className="h-full w-full object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to="/produto/$slug" params={{ slug: it.slug }} className="line-clamp-2 font-semibold leading-snug">
                    {it.nome}
                  </Link>
                  {it.cores && it.cores.length > 0 ? (
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {it.cores.map((c) => (
                        <p key={c.cor} className="font-mono">{formatarCorTamanhos(c.cor, c.qtd)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tamanhosLinha(it.qtd) || "Sem peças"}</p>
                  )}
                  <p className="mt-1 text-sm tabular-nums">
                    {it.pecas} × R$ {money(it.preco)} = <strong>{brl(it.valor)}</strong>
                  </p>
                </div>
              </div>
              {it.observacao && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">📝 {it.observacao}</p>}
              {it.precoProxima !== null && it.precoProxima < it.preco && resumo.proxima && (
                <p className="mt-2 text-sm font-medium text-gold-ink">
                  {faltamPecas(resumo.proxima.faltam)} para o preço de R$ {money(it.precoProxima)} por peça
                </p>
              )}

              {editando === it.produtoId ? (
                <EditItem item={it} onDone={() => setEditando(null)} />
              ) : (
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditando(it.produtoId)}>
                    <Pencil /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      analytics.removeFromCart({
                        id: it.produtoId,
                        nome: it.nome,
                        precoUnitario: it.preco,
                        pecasTotal: it.pecas,
                        valorTotal: it.valor,
                      });
                      cart.remove(it.produtoId);
                    }}
                  >
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
          <ShippingCalculator
            itens={resumo.itens.map((i) => ({ nome: i.nome, pecas: i.pecas }))}
            className="mt-4"
          />

          <Button
            size="lg"
            className="mt-5 w-full text-base font-semibold h-12 shadow-sm"
            disabled={!resumo.podeFinalizar || indisponiveis.length > 0}
            onClick={() => {
              analytics.beginCheckout({
                total: resumo.total,
                totalPecas: resumo.totalPecas,
                itens: resumo.itens.map((i) => ({
                  id: i.produtoId,
                  nome: i.nome,
                  pecas: i.pecas,
                  valor: i.valor,
                })),
              });
              navigate({ to: "/finalizar" });
            }}
          >
            Finalizar pedido <ArrowRight className="ml-2 size-5" />
          </Button>

          {resumo.faltamMinimo > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {faltamPecas(resumo.faltamMinimo)} para atingir o pedido mínimo
            </p>
          )}

          <div className="mt-2 text-center">
            <Button variant="link" asChild className="px-0 text-sm">
              <Link to="/">Continuar escolhendo</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EditItem({ item, onDone }: { item: CartItem; onDone: () => void }) {
  const [cores, setCores] = useState(item.cores || []);
  const [qtd, setQtd] = useState(item.qtd);
  const [obs, setObs] = useState(item.observacao);

  const hasCores = cores.length > 0;
  const isPlusSize =
    Boolean((item.qtd.g1 && item.qtd.g1 > 0) || (item.qtd.g2 && item.qtd.g2 > 0)) ||
    Boolean(item.cores && item.cores.some((c) => (c.qtd.g1 && c.qtd.g1 > 0) || (c.qtd.g2 && c.qtd.g2 > 0))) ||
    /plus\s*size|plussize|^plus/i.test(item.nome || "") ||
    /plus\s*size|plussize|^plus/i.test(item.codigo || "") ||
    /plus\s*size|plussize|^plus/i.test(item.slug || "");

  const tamanhosItem = isPlusSize ? TAMANHOS_PLUS_SIZE : TAMANHOS_PADRAO;

  function updateCorQtd(corNome: string, key: keyof Qtd, val: number) {
    const nextCores = cores.map((c) => (c.cor === corNome ? { ...c, qtd: { ...c.qtd, [key]: val } } : c));
    setCores(nextCores);
    setQtd({
      p: nextCores.reduce((acc, c) => acc + (c.qtd.p || 0), 0),
      m: nextCores.reduce((acc, c) => acc + (c.qtd.m || 0), 0),
      g: nextCores.reduce((acc, c) => acc + (c.qtd.g || 0), 0),
      gg: nextCores.reduce((acc, c) => acc + (c.qtd.gg || 0), 0),
      g1: nextCores.reduce((acc, c) => acc + (c.qtd.g1 || 0), 0),
      g2: nextCores.reduce((acc, c) => acc + (c.qtd.g2 || 0), 0),
    });
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {hasCores ? (
        <div className="space-y-3">
          {cores.map((c) => (
            <div key={c.cor} className="rounded-xl border bg-background/50 p-2.5">
              <p className="mb-2 text-sm font-semibold text-foreground">Cor: {c.cor}</p>
              <div className="grid grid-cols-2 gap-2">
                {tamanhosItem.map((t) => (
                  <QtyStepper
                    key={t.key}
                    compact
                    label={t.label}
                    value={c.qtd[t.key] || 0}
                    onChange={(v) => updateCorQtd(c.cor, t.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {tamanhosItem.map((t) => (
            <QtyStepper key={t.key} compact label={t.label} value={qtd[t.key] || 0} onChange={(v) => setQtd((q) => ({ ...q, [t.key]: v }))} />
          ))}
        </div>
      )}
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
            const total = pecas(qtd);
            if (total === 0) cart.remove(item.produtoId);
            else {
              const activeCores = cores.filter((c) => pecas(c.qtd) > 0);
              cart.update(item.produtoId, {
                qtd,
                cores: activeCores.length ? activeCores : undefined,
                observacao: obs.trim(),
              });
            }
            onDone();
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
