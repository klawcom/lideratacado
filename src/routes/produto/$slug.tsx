import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Info, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaGallery } from "@/components/store/media-gallery";
import { QtyStepper } from "@/components/store/qty-stepper";
import { StickyBar } from "@/components/store/sticky-bar";
import { produtoQuery, siteQuery } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { FAIXAS, TAMANHOS, faixaDoTotal, menorPreco, pecas, precoNaFaixa, type Qtd } from "@/lib/pricing";
import { brl, money } from "@/lib/format";
import { cart, useCartCount } from "@/lib/cart";
import { canonical, seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ context, params }) => {
    const [site, p] = await Promise.all([
      context.queryClient.ensureQueryData(siteQuery()),
      context.queryClient.ensureQueryData(produtoQuery(params.slug)),
    ]);
    if (!p) throw notFound();
    const precos = p.faixas_preco.map((f) => f.preco_peca);
    return {
      origin: site.origin,
      nome: p.nome,
      descricao: p.descricao,
      codigo: p.codigo_modelo,
      imagem: imagemPrincipal(p.produto_midias),
      min: precos.length ? Math.min(...precos) : null,
      max: precos.length ? Math.max(...precos) : null,
      estoque: p.estoque,
    };
  },
  head: ({ loaderData: d, params }) => {
    const path = `/produto/${params.slug}`;
    const img = d?.imagem && d.origin ? (d.imagem.startsWith("http") ? d.imagem : `${d.origin}${d.imagem}`) : undefined;
    const desc = `${d?.nome ?? "Produto"} no atacado${d?.min ? ` a partir de R$ ${money(d.min)} por peça` : ""}. ${d?.descricao ?? ""}`.trim();
    const jsonLd = d
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: d.nome,
          sku: d.codigo,
          description: d.descricao || d.nome,
          image: img ? [img] : undefined,
          brand: { "@type": "Brand", name: "Líder Atacado" },
          offers:
            d.min !== null
              ? {
                  "@type": "AggregateOffer",
                  priceCurrency: "BRL",
                  lowPrice: d.min,
                  highPrice: d.max,
                  availability: d.estoque > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                  url: d.origin ? `${d.origin}${path}` : undefined,
                }
              : undefined,
        }
      : null;
    return {
      meta: seo({ title: `${d?.nome ?? "Produto"} | Líder Atacado`, description: desc.slice(0, 160), origin: d?.origin, path, image: img, type: "product" }),
      links: canonical(d?.origin, path),
      scripts: jsonLd ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] : [],
    };
  },
  component: ProdutoPage,
});

const ZERO: Qtd = { p: 0, m: 0, g: 0, gg: 0 };

function ProdutoPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(produtoQuery(slug));
  const navigate = useNavigate();
  const noCarrinho = useCartCount();
  const [qtd, setQtd] = useState<Qtd>(ZERO);
  const [obs, setObs] = useState("");
  if (!p) return null;

  const n = pecas(qtd);
  const faixaAtual = faixaDoTotal(noCarrinho + n);
  const precoAtual = precoNaFaixa(p.faixas_preco, faixaAtual);
  const min = menorPreco(p.faixas_preco);

  function adicionar() {
    if (!p || n < 1) return;
    cart.add({
      produtoId: p.id,
      nome: p.nome,
      slug: p.slug,
      codigo: p.codigo_modelo,
      imagem: imagemPrincipal(p.produto_midias),
      faixas: p.faixas_preco,
      qtd,
      observacao: obs.trim(),
    });
    setQtd(ZERO);
    setObs("");
    toast.success(`${n} ${n === 1 ? "peça adicionada" : "peças adicionadas"} ao pedido`, {
      action: { label: "Ver pedido", onClick: () => navigate({ to: "/carrinho" }) },
    });
  }

  return (
    <div className="container-page pb-bar pt-4 md:pt-8">
      {p.categorias && (
        <Link
          to="/categoria/$slug"
          params={{ slug: p.categorias.slug }}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" /> {p.categorias.nome}
        </Link>
      )}
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <MediaGallery midias={p.produto_midias} nome={p.nome} />

        <div className="min-w-0 space-y-8">
          <div>
            <p className="text-sm text-muted-foreground">Modelo {p.codigo_modelo}</p>
            <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">{p.nome}</h1>
            {min !== null && (
              <p className="mt-2 text-lg">
                a partir de <strong>R$ {money(min)}</strong> por peça
              </p>
            )}
          </div>

          <section aria-labelledby="tabela-precos" className="rounded-2xl border bg-card p-4">
            <h2 id="tabela-precos" className="font-sans text-base font-bold tracking-normal">
              Preço por peça
            </h2>
            <p className="text-sm text-muted-foreground">Conforme o total de peças no pedido, somando todos os produtos.</p>
            <ul className="mt-3 divide-y">
              {FAIXAS.map((f) => {
                const v = precoNaFaixa(p.faixas_preco, f);
                const ativa = f === faixaAtual;
                return (
                  <li key={f} className={cn("flex items-center justify-between gap-3 py-2.5", ativa && "font-semibold")}>
                    <span className="flex items-center gap-2">
                      {ativa && <span className="size-2 rounded-full bg-primary" aria-hidden />}a partir de {f} peças no pedido
                    </span>
                    <span className={cn("tabular-nums", ativa && "text-gold-ink")}>R$ {money(v)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="tamanhos" className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 id="tamanhos" className="font-sans text-base font-bold tracking-normal">
                Quantidade por tamanho
              </h2>
              <span className="text-sm text-muted-foreground">{n} peças</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {TAMANHOS.map((t) => (
                <QtyStepper key={t.key} label={t.label} value={qtd[t.key]} onChange={(v) => setQtd((q) => ({ ...q, [t.key]: v }))} />
              ))}
            </div>
            <div className="flex gap-3 rounded-2xl bg-accent p-4 text-accent-foreground">
              <Info className="mt-0.5 size-5 shrink-0" />
              <p className="text-[15px] font-medium">Cores sortidas, conforme disponibilidade do estoque. Não é possível escolher cores.</p>
            </div>
            <div>
              <label htmlFor="obs-item" className="mb-1.5 block font-medium">
                Observação do item <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="obs-item"
                maxLength={300}
                rows={3}
                value={obs}
                onChange={(e) => setObs(e.target.value.slice(0, 300))}
                placeholder="Ex.: preferência de tons claros, se houver"
                enterKeyHint="done"
              />
              <p className="mt-1 text-right text-sm text-muted-foreground">{obs.length}/300</p>
            </div>
          </section>

          {(p.descricao || p.composicao) && (
            <section className="space-y-4">
              {p.descricao && (
                <div>
                  <h2 className="font-sans text-base font-bold tracking-normal">Descrição</h2>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">{p.descricao}</p>
                </div>
              )}
              {p.composicao && (
                <div>
                  <h2 className="font-sans text-base font-bold tracking-normal">Composição</h2>
                  <p className="mt-1 text-muted-foreground">{p.composicao}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <StickyBar>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-semibold tabular-nums">{n > 0 ? `${n} ${n === 1 ? "peça" : "peças"}` : "Escolha os tamanhos"}</p>
          <p className="truncate text-sm text-muted-foreground tabular-nums">
            {n > 0 ? `${brl(precoAtual * n)} · R$ ${money(precoAtual)}/peça` : `${noCarrinho} no pedido`}
          </p>
        </div>
        <Button size="lg" onClick={adicionar} disabled={n < 1} className="shrink-0 px-5">
          <ShoppingBag /> Adicionar ao pedido
        </Button>
      </StickyBar>
    </div>
  );
}
