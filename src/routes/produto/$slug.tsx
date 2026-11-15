import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Info, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaGallery } from "@/components/store/media-gallery";
import { QtyStepper } from "@/components/store/qty-stepper";
import { ShippingCalculator } from "@/components/store/shipping-calculator";
import { produtoQuery, siteQuery } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { FAIXAS, TAMANHOS, faixaDoTotal, menorPreco, pecas, precoNaFaixa, type Qtd } from "@/lib/pricing";
import { brl, money } from "@/lib/format";
import { cart, useCartCount } from "@/lib/cart";
import { CORES_PADRAO, decodeCoresProduto, formatarCorTamanhos, getCorDef } from "@/lib/colors";
import {
  COMPOSICAO_COTTON_PIMA,
  DESCRICAO_COTTON_PIMA,
  MEDIDAS_COTTON_PIMA,
  isProdutoCottonPima,
} from "@/lib/pima-defaults";
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

  if (!p) return null;

  const isPima = isProdutoCottonPima(p);
  const { composicaoLimpa, coresHabilitadas } = decodeCoresProduto(p.composicao);
  const coresDisponiveis = CORES_PADRAO.filter((c) => coresHabilitadas.includes(c.nome));
  const listaCores = coresDisponiveis.length > 0 ? coresDisponiveis : CORES_PADRAO;

  // Se for Cotton Pima, garante a descrição oficial caso o banco ainda tenha o texto genérico antigo
  const isGenericDesc =
    !p.descricao ||
    p.descricao.startsWith("Camiseta Pima Modelo") ||
    p.descricao.includes("Cores sortidas, conforme disponibilidade do estoque.");

  const descFinal = isPima
    ? isGenericDesc
      ? DESCRICAO_COTTON_PIMA
      : p.descricao.split(/Medidas aproximadas/i)[0].trim()
    : p.descricao;

  const compFinal = isPima ? (composicaoLimpa || COMPOSICAO_COTTON_PIMA) : composicaoLimpa;

  const [corAtiva, setCorAtiva] = useState<string>(listaCores[0]?.nome ?? "Branca");
  const [coresQtd, setCoresQtd] = useState<Record<string, Qtd>>({});
  const [obs, setObs] = useState("");

  const qtdCorAtiva = coresQtd[corAtiva] ?? ZERO;
  const pecasCorAtiva = pecas(qtdCorAtiva);

  function setQtdCor(key: keyof Qtd, val: number) {
    setCoresQtd((prev) => ({
      ...prev,
      [corAtiva]: {
        ...(prev[corAtiva] ?? ZERO),
        [key]: val,
      },
    }));
  }

  const totalQtd: Qtd = Object.values(coresQtd).reduce<Qtd>(
    (acc, q) => ({
      p: acc.p + (q.p || 0),
      m: acc.m + (q.m || 0),
      g: acc.g + (q.g || 0),
      gg: acc.gg + (q.gg || 0),
    }),
    { p: 0, m: 0, g: 0, gg: 0 },
  );

  const n = pecas(totalQtd);
  const faixaAtual = faixaDoTotal(noCarrinho + n);
  const precoAtual = precoNaFaixa(p.faixas_preco, faixaAtual);
  const min = menorPreco(p.faixas_preco);

  function adicionar() {
    if (!p || n < 1) return;
    const itemCores = Object.entries(coresQtd)
      .filter(([_, q]) => pecas(q) > 0)
      .map(([cor, q]) => ({ cor, qtd: q }));

    cart.add({
      produtoId: p.id,
      nome: p.nome,
      slug: p.slug,
      codigo: p.codigo_modelo,
      imagem: imagemPrincipal(p.produto_midias),
      faixas: p.faixas_preco,
      qtd: totalQtd,
      cores: itemCores.length ? itemCores : undefined,
      observacao: obs.trim(),
    });
    setCoresQtd({});
    setObs("");
    toast.success(`${n} ${n === 1 ? "peça adicionada" : "peças adicionadas"} ao pedido`, {
      action: { label: "Ver pedido", onClick: () => navigate({ to: "/carrinho" }) },
    });
  }

  const corDefAtiva = getCorDef(corAtiva);
  const coresPreenchidas = Object.entries(coresQtd).filter(([_, q]) => pecas(q) > 0);

  return (
    <div className="container-page pb-12 pt-4 md:pt-6">
      {p.categorias && (
        <Link
          to="/categoria/$slug"
          params={{ slug: p.categorias.slug }}
          className="-ml-1 mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> {p.categorias.nome}
        </Link>
      )}
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="space-y-5">
          <MediaGallery midias={p.produto_midias} nome={p.nome} />

          {(descFinal || compFinal || isPima) && (
            <section aria-labelledby="secao-descricao" className="rounded-2xl border bg-card/60 p-4 sm:p-5 space-y-3.5">
              {descFinal && (
                <div>
                  <h2 id="secao-descricao" className="font-sans text-sm font-semibold tracking-normal text-foreground">
                    Descrição do produto
                  </h2>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                    {descFinal}
                  </p>
                </div>
              )}

              {compFinal && (
                <div className={descFinal ? "pt-3 border-t border-border/60" : ""}>
                  <h2 className="font-sans text-sm font-semibold tracking-normal text-foreground">Composição</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{compFinal}</p>
                </div>
              )}

              {isPima && (
                <div className={descFinal || compFinal ? "pt-3 border-t border-border/60 space-y-2" : "space-y-2"}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-sans text-sm font-semibold tracking-normal text-foreground">
                      Medidas aproximadas
                    </h2>
                    <span className="text-[11px] text-muted-foreground uppercase font-medium">
                      Camisetas Masculinas
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {MEDIDAS_COTTON_PIMA.map((m) => (
                      <div
                        key={m.tamanho}
                        className="rounded-xl border bg-background/70 p-2.5 text-center shadow-2xs"
                      >
                        <span className="inline-block text-xs font-bold text-primary bg-primary/10 rounded-md px-2 py-0.5 mb-1">
                          Tam {m.tamanho}
                        </span>
                        <p className="text-xs font-semibold text-foreground">{m.largura}</p>
                        <p className="text-[11px] text-muted-foreground">× {m.altura}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Modelo {p.codigo_modelo}</p>
            <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{p.nome}</h1>
            {min !== null && (
              <p className="mt-1 text-sm text-muted-foreground">
                a partir de <strong className="font-semibold text-foreground">R$ {money(min)}</strong> por peça
              </p>
            )}
          </div>

          <section aria-labelledby="tabela-precos" className="rounded-2xl border bg-card p-3.5 sm:p-4">
            <h2 id="tabela-precos" className="font-sans text-sm font-semibold tracking-normal">
              Preço por peça
            </h2>
            <p className="text-xs text-muted-foreground">Conforme o total de peças no pedido, somando todos os produtos.</p>
            <ul className="mt-2.5 divide-y divide-border/60 text-sm">
              {FAIXAS.map((f) => {
                const v = precoNaFaixa(p.faixas_preco, f);
                const ativa = f === faixaAtual;
                return (
                  <li key={f} className={cn("flex items-center justify-between gap-3 py-1.5", ativa && "font-semibold")}>
                    <span className="flex items-center gap-2">
                      {ativa && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}a partir de {f} peças no pedido
                    </span>
                    <span className={cn("tabular-nums", ativa && "text-gold-ink font-bold")}>R$ {money(v)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Seleção de cores e tamanhos */}
          <section aria-labelledby="secao-cores" className="space-y-3.5">
            <div>
              <div className="flex items-baseline justify-between">
                <h2 id="secao-cores" className="font-sans text-sm font-semibold tracking-normal">
                  Cor: <span className="font-bold text-foreground">{corDefAtiva.nome}</span>
                </h2>
                {pecasCorAtiva > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pecasCorAtiva} {pecasCorAtiva === 1 ? "peça nesta cor" : "peças nesta cor"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Toque na cor para definir os tamanhos:</p>
              {/* Botões de cor reduzidos */}
              <div className="mt-2 flex flex-wrap gap-2">
                {listaCores.map((cor) => {
                  const ativa = cor.nome === corAtiva;
                  const count = pecas(coresQtd[cor.nome] ?? ZERO);
                  return (
                    <button
                      key={cor.nome}
                      type="button"
                      onClick={() => setCorAtiva(cor.nome)}
                      aria-label={`${cor.nome}${count > 0 ? ` (${count} peças)` : ""}`}
                      aria-pressed={ativa}
                      title={cor.nome}
                      className={cn(
                        "relative size-7 sm:size-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        cor.border && "border border-border/70",
                        ativa
                          ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-xs"
                          : "hover:scale-105 opacity-85 hover:opacity-100",
                      )}
                      style={{ backgroundColor: cor.hex }}
                    >
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border bg-card/60 p-3.5">
              <div className="flex items-baseline justify-between">
                <h3 className="font-sans text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Tamanhos para {corDefAtiva.nome}
                </h3>
                <span className="text-xs text-muted-foreground tabular-nums">{pecasCorAtiva} peças</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {TAMANHOS.map((t) => (
                  <QtyStepper
                    key={t.key}
                    compact
                    label={t.label}
                    value={qtdCorAtiva[t.key]}
                    onChange={(v) => setQtdCor(t.key, v)}
                  />
                ))}
              </div>
            </div>

            {coresPreenchidas.length > 0 && (
              <div className="rounded-2xl border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Cores escolhidas no produto:</span>
                  <span className="text-muted-foreground tabular-nums">Total: {n} peças</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {coresPreenchidas.map(([corNome, q]) => (
                    <div
                      key={corNome}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-0.5 text-xs"
                    >
                      <span
                        className="size-2.5 rounded-full border border-border"
                        style={{ backgroundColor: getCorDef(corNome).hex }}
                      />
                      <span className="font-medium">{formatarCorTamanhos(corNome, q)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCoresQtd((prev) => {
                            const next = { ...prev };
                            delete next[corNome];
                            return next;
                          })
                        }
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        title={`Remover cor ${corNome}`}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 rounded-2xl bg-accent p-3 text-accent-foreground text-xs sm:text-sm">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p className="font-medium leading-relaxed">
                As cores selecionadas serão atendidas conforme disponibilidade do estoque. Caso alguma cor escolhida não esteja disponível, enviaremos cores sortidas.
              </p>
            </div>

            <div>
              <label htmlFor="obs-item" className="mb-1 block text-xs font-medium text-foreground">
                Observação do item <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Textarea
                id="obs-item"
                maxLength={300}
                rows={2}
                value={obs}
                onChange={(e) => setObs(e.target.value.slice(0, 300))}
                placeholder="Ex.: preferência de tons claros, se houver"
                enterKeyHint="done"
                className="text-sm"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{obs.length}/300</p>
            </div>

            {/* Adicionar ao pedido colocado diretamente na página */}
            <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base tabular-nums">
                    {n > 0 ? `${n} ${n === 1 ? "peça selecionada" : "peças selecionadas"}` : "Nenhuma peça selecionada"}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {n > 0 ? `${brl(precoAtual * n)} · R$ ${money(precoAtual)}/peça` : `${noCarrinho} peças no carrinho`}
                  </p>
                </div>
                {n > 0 && (
                  <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-1">
                    Faixa: {faixaAtual}+ peças
                  </span>
                )}
              </div>

              <Button
                size="lg"
                onClick={adicionar}
                disabled={n < 1}
                className="w-full text-base font-semibold h-12 shadow-sm"
              >
                <ShoppingBag className="mr-2 size-5" /> Adicionar ao pedido
              </Button>
            </div>

            <ShippingCalculator itens={[{ nome: p.nome, pecas: n > 0 ? n : 10 }]} />
          </section>
        </div>
      </div>
    </div>
  );
}
