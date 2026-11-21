import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MediaGallery } from "@/components/store/media-gallery";
import { QtyStepper } from "@/components/store/qty-stepper";
import { ShippingCalculator } from "@/components/store/shipping-calculator";
import { produtoQuery, siteQuery } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { FAIXAS, TAMANHOS, TAMANHOS_PADRAO, TAMANHOS_PLUS_SIZE, faixaDoTotal, menorPreco, pecas, precoNaFaixa, type Qtd } from "@/lib/pricing";
import { brl, money, whatsappLinkNumber } from "@/lib/format";
import { cart, useCartCount } from "@/lib/cart";
import { CORES_PADRAO, decodeCoresProduto, formatarCorTamanhos, getCorContrasteClasses, getCorDef } from "@/lib/colors";
import {
  COMPOSICAO_COTTON_PIMA,
  DESCRICAO_COTTON_PIMA,
  MEDIDAS_COTTON_PIMA,
  MEDIDAS_PLUS_SIZE,
  MEDIDAS_POLO,
  isProdutoCottonPima,
  isProdutoPlusSize,
  isProdutoPolo,
} from "@/lib/pima-defaults";
import { canonical, resolveOrigin, schemaBreadcrumbs, seo } from "@/lib/seo";
import { analytics } from "@/lib/analytics";
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
      faixasCount: precos.length,
      estoque: p.estoque,
      categoria: p.categorias ? { nome: p.categorias.nome, slug: p.categorias.slug } : null,
    };
  },
  head: ({ loaderData: d, params }) => {
    const path = `/produto/${params.slug}`;
    const baseOrigin = resolveOrigin(d?.origin);
    const img = d?.imagem
      ? d.imagem.startsWith("http")
        ? d.imagem
        : `${baseOrigin}${d.imagem.startsWith("/") ? d.imagem : `/${d.imagem}`}`
      : undefined;

    const desc = `${d?.nome ?? "Produto"} no atacado direto de fábrica${d?.min ? ` a partir de R$ ${money(d.min)}/peça (mínimo 10 peças)` : ""}. Grade livre de cores e tamanhos com envio para todo o Brasil. Peça pelo WhatsApp.`;

    const crumbs = [
      { name: "Início", path: "/" },
      ...(d?.categoria ? [{ name: d.categoria.nome, path: `/categoria/${d.categoria.slug}` }] : []),
      { name: d?.nome ?? "Produto", path },
    ];
    const breadcrumbsJson = schemaBreadcrumbs(crumbs, baseOrigin);

    const productJson = d
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: d.nome,
          sku: d.codigo,
          description: d.descricao || d.nome,
          image: img ? [img] : undefined,
          brand: { "@type": "Brand", name: "Líder Atacado" },
          itemCondition: "https://schema.org/NewCondition",
          offers:
            d.min !== null
              ? {
                  "@type": "AggregateOffer",
                  priceCurrency: "BRL",
                  lowPrice: d.min,
                  highPrice: d.max,
                  offerCount: d.faixasCount || 4,
                  availability: d.estoque > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                  url: `${baseOrigin}${path}`,
                }
              : undefined,
        }
      : null;

    const scripts: Array<Record<string, any>> = [];
    if (productJson) {
      scripts.push({ type: "application/ld+json", children: JSON.stringify(productJson) });
    }
    scripts.push({ type: "application/ld+json", children: JSON.stringify(breadcrumbsJson) });

    return {
      meta: seo({
        title: `${d?.nome ?? "Produto"} no Atacado a partir de 10 peças | Líder Atacado`,
        description: desc.slice(0, 160),
        origin: baseOrigin,
        path,
        image: img,
        type: "product",
      }),
      links: canonical(baseOrigin, path),
      scripts,
    };
  },
  component: ProdutoPage,
});

const ZERO: Qtd = { p: 0, m: 0, g: 0, gg: 0, g1: 0, g2: 0 };

function DetalhesProduto({
  descFinal,
  compFinal,
  isPima,
  isPolo,
  isPlusSize,
}: {
  descFinal?: string | null;
  compFinal?: string | null;
  isPima: boolean;
  isPolo: boolean;
  isPlusSize: boolean;
}) {
  if (!descFinal && !compFinal && !isPima && !isPolo && !isPlusSize) return null;
  return (
    <section aria-labelledby="secao-descricao" className="rounded-2xl border bg-card/60 p-4 sm:p-5 space-y-3.5 max-w-full">
      {descFinal && (
        <div>
          <h2 id="secao-descricao" className="font-sans text-sm font-semibold tracking-normal text-foreground">
            Descrição do produto
          </h2>
          <p className="mt-1.5 whitespace-pre-line text-sm text-muted-foreground leading-relaxed break-words">
            {descFinal}
          </p>
        </div>
      )}

      {compFinal && (
        <div className={descFinal ? "pt-3 border-t border-border/60" : ""}>
          <h2 className="font-sans text-sm font-semibold tracking-normal text-foreground">Composição</h2>
          <p className="mt-1 text-sm text-muted-foreground break-words">{compFinal}</p>
        </div>
      )}

      {(isPima || isPolo || isPlusSize) && (
        <div className={descFinal || compFinal ? "pt-3 border-t border-border/60 space-y-2" : "space-y-2"}>
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h2 className="font-sans text-sm font-semibold tracking-normal text-foreground">
              Medidas aproximadas
            </h2>
            <span className="text-[11px] text-muted-foreground uppercase font-medium">
              {isPlusSize ? "Camisetas Plus Size" : isPolo ? "Camisas Polos Masculinas" : "Camisetas Masculinas"}
            </span>
          </div>
          <div className={cn("grid gap-2", isPlusSize ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
            {(isPlusSize ? MEDIDAS_PLUS_SIZE : isPolo ? MEDIDAS_POLO : MEDIDAS_COTTON_PIMA).map((m) => (
              <div
                key={m.tamanho}
                className="rounded-xl border bg-background/70 p-2 text-center shadow-2xs min-w-0"
              >
                <span className="inline-block text-xs font-bold text-primary bg-primary/10 rounded-md px-2 py-0.5 mb-1">
                  Tam {m.tamanho}
                </span>
                <p className="text-xs font-semibold text-foreground truncate">{m.largura}</p>
                <p className="text-[11px] text-muted-foreground truncate">× {m.altura}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProdutoPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(produtoQuery(slug));
  const { data: site } = useQuery(siteQuery());
  const waNumber = site?.config?.whatsapp || "5547991364084";
  const navigate = useNavigate();
  const noCarrinho = useCartCount();

  if (!p) return null;

  const isPima = isProdutoCottonPima(p);
  const isPolo = !isPima && isProdutoPolo(p);
  const isPlusSize = isProdutoPlusSize(p);
  const tamanhosDisponiveis = isPlusSize ? TAMANHOS_PLUS_SIZE : TAMANHOS_PADRAO;
  const { composicaoLimpa, coresHabilitadas, fotoCores } = decodeCoresProduto(p.composicao);
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
      : (p.descricao.split(/Medidas aproximadas/i)[0] ?? "").trim()
    : isPolo || isPlusSize
      ? (p.descricao ? (p.descricao.split(/Medidas aproximadas/i)[0] ?? "").trim() : "")
      : p.descricao;

  const compFinal = isPima ? (composicaoLimpa || COMPOSICAO_COTTON_PIMA) : composicaoLimpa;

  const [corAtiva, setCorAtiva] = useState<string>(listaCores[0]?.nome ?? "Branca");
  const [coresQtd, setCoresQtd] = useState<Record<string, Qtd>>({});

  const qtdCorAtiva = coresQtd[corAtiva] ?? ZERO;
  const pecasCorAtiva = pecas(qtdCorAtiva);

  const totalQtd: Qtd = Object.values(coresQtd).reduce<Qtd>(
    (acc, q) => ({
      p: (acc.p || 0) + (q.p || 0),
      m: (acc.m || 0) + (q.m || 0),
      g: (acc.g || 0) + (q.g || 0),
      gg: (acc.gg || 0) + (q.gg || 0),
      g1: (acc.g1 || 0) + (q.g1 || 0),
      g2: (acc.g2 || 0) + (q.g2 || 0),
    }),
    { p: 0, m: 0, g: 0, gg: 0, g1: 0, g2: 0 },
  );

  const n = pecas(totalQtd);
  const faixaAtual = faixaDoTotal(noCarrinho + n);
  const precoAtual = precoNaFaixa(p.faixas_preco, faixaAtual);
  const min = menorPreco(p.faixas_preco);

  useEffect(() => {
    if (p) {
      analytics.viewItem({
        id: p.id,
        nome: p.nome,
        categoria: p.categorias?.nome,
        precoMin: min,
      });
    }
  }, [p?.id, min]);

  function setQtdCor(key: keyof Qtd, val: number) {
    setCoresQtd((prev) => ({
      ...prev,
      [corAtiva]: {
        ...(prev[corAtiva] ?? ZERO),
        [key]: val,
      },
    }));
    if (val > 0 && p) {
      analytics.selectVariant({
        id: p.id,
        nome: p.nome,
        cor: corAtiva,
        tamanho: key.toUpperCase(),
        quantidade: val,
      });
    }
  }

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
      observacao: "",
    });

    analytics.addToCart({
      id: p.id,
      nome: p.nome,
      precoUnitario: precoAtual,
      pecasTotal: n,
      valorTotal: precoAtual * n,
      cores: itemCores.map((c) => ({ cor: c.cor, pecas: pecas(c.qtd) })),
    });

    setCoresQtd({});
    toast.success(`${n} ${n === 1 ? "peça adicionada" : "peças adicionadas"} ao pedido`, {
      action: { label: "Ver pedido", onClick: () => navigate({ to: "/carrinho" }) },
    });
  }

  const corDefAtiva = getCorDef(corAtiva);
  const coresPreenchidas = Object.entries(coresQtd).filter(([_, q]) => pecas(q) > 0);

  return (
    <div className="container-page py-4 sm:py-6 md:py-10 min-w-0">
      {/* Navegação estrutural / Breadcrumb */}
      <nav aria-label="Navegação estrutural" className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link to="/" className="inline-flex min-h-11 items-center hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3 text-muted-foreground/60" aria-hidden />
        {p.categorias ? (
          <>
            <Link
              to="/categoria/$slug"
              params={{ slug: p.categorias.slug }}
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              {p.categorias.nome}
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" aria-hidden />
          </>
        ) : null}
        <span className="font-semibold text-foreground truncate max-w-[220px]" aria-current="page">
          {p.nome}
        </span>
      </nav>

      {/* Cabeçalho mobile: com a única tag H1 da página */}
      <div className="mb-3 block md:hidden min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Modelo {p.codigo_modelo}</p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">{p.nome}</h1>
        {min !== null && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            a partir de <strong className="font-semibold text-foreground">R$ {money(min)}</strong> por peça
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="min-w-0 space-y-5">
          <MediaGallery
            midias={p.produto_midias}
            nome={p.nome}
            corAtiva={corAtiva}
            fotoCores={fotoCores}
          />

          {/* Na versão desktop, a descrição fica na coluna esquerda abaixo da galeria */}
          <div className="hidden md:block">
            <DetalhesProduto
              descFinal={descFinal}
              compFinal={compFinal}
              isPima={isPima}
              isPolo={isPolo}
              isPlusSize={isPlusSize}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          {/* Cabeçalho desktop (título visualmente idêntico, evitando duplicidade semântica de H1) */}
          <div className="hidden md:block">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Modelo {p.codigo_modelo}</p>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {p.nome}
            </div>
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

          {/* Aviso sobre cores e imagens ilustrativas no atacado */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/25 p-2.5 sm:p-3 text-amber-900 dark:text-amber-200 shadow-2xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-xs sm:text-sm leading-snug space-y-1.5">
                <p>
                  <span className="font-bold text-amber-800 dark:text-amber-300">⚠️ Aviso: Cores e Imagens no Atacado:</span>{" "}
                  <span className="text-amber-900/90 dark:text-amber-200/90">
                    Vendemos no atacado, direto de fábrica e com alto giro. As cores são atendidas conforme o estoque disponível na hora da separação. Se alguma estiver em falta, enviamos cores sortidas, de mesma qualidade e modelo.
                  </span>
                </p>
                <p className="text-amber-900/90 dark:text-amber-200/90">
                  As imagens são meramente ilustrativas com base nos produtos reais. Você pode{" "}
                  <a
                    href={`https://wa.me/${whatsappLinkNumber(waNumber)}?text=${encodeURIComponent(`Olá! Gostaria de solicitar imagens e vídeos reais das peças do produto: ${p.nome}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline underline-offset-2 hover:text-amber-950 dark:hover:text-white"
                  >
                    solicitar imagens e vídeos reais das peças via WhatsApp
                  </a>{" "}
                  a qualquer momento.
                </p>
              </div>
            </div>
          </div>

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
              {/* Botões de cor com área de toque mínima de 44px para acessibilidade */}
              <div className="mt-2 flex flex-wrap gap-1 sm:gap-1.5">
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
                      className="group relative flex size-11 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <span
                        className={cn(
                          "relative size-7 sm:size-8 rounded-full transition-all",
                          getCorContrasteClasses(cor.hex),
                          ativa
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-sm"
                            : "group-hover:scale-105",
                        )}
                        style={{ backgroundColor: cor.hex }}
                      >
                        {count > 0 && (
                          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-xs">
                            {count}
                          </span>
                        )}
                      </span>
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
              <div className={cn("grid gap-2", isPlusSize ? "grid-cols-2" : "sm:grid-cols-2")}>
                {tamanhosDisponiveis.map((t) => (
                  <QtyStepper
                    key={t.key}
                    compact
                    label={t.label}
                    value={qtdCorAtiva[t.key] || 0}
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
                        className={cn("size-2.5 rounded-full shrink-0", getCorContrasteClasses(getCorDef(corNome).hex))}
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

            {/* Detalhes do produto (Descrição, Composição e Medidas) no mobile após as opções de compra */}
            <div className="block md:hidden pt-2">
              <DetalhesProduto
                descFinal={descFinal}
                compFinal={compFinal}
                isPima={isPima}
                isPolo={isPolo}
                isPlusSize={isPlusSize}
              />
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
