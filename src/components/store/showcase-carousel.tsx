import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Tag } from "lucide-react";
import type { FaixaRow, MidiaRow, ProdutoCard } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { menorPreco } from "@/lib/pricing";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VitrineProduct = {
  id: string;
  nome: string;
  slug: string;
  codigo_modelo: string;
  badge: string;
  categoriaNome: string;
  categoriaSlug: string;
  produto_midias: MidiaRow[];
  faixas_preco: FaixaRow[];
};

/**
 * Seleciona os produtos para a vitrine no topo da página:
 * 1. Os mais vendidos (destaque = true)
 * 2. 1 produto representante de cada categoria ativa
 * 3. As novidades (primeiros produtos cadastrados em cada categoria)
 * Deduplica para que cada peça apareça apenas uma vez.
 */
export function buildVitrineProducts(
  categorias: { id?: string | number; nome: string; slug: string; produtos: ProdutoCard[] }[],
): VitrineProduct[] {
  const map = new Map<string, VitrineProduct>();

  // 1. Mais Vendidos (destaque = true)
  for (const c of categorias) {
    for (const p of c.produtos) {
      if (p.destaque && !map.has(p.id)) {
        map.set(p.id, {
          ...p,
          badge: "Mais Vendido",
          categoriaNome: c.nome,
          categoriaSlug: c.slug,
        });
      }
    }
  }

  // 2. 1 de cada categoria
  for (const c of categorias) {
    const first = c.produtos[0];
    if (first && !map.has(first.id)) {
      map.set(first.id, {
        ...first,
        badge: c.nome,
        categoriaNome: c.nome,
        categoriaSlug: c.slug,
      });
    }
  }

  // 3. Novidades (itens seguintes de cada categoria)
  for (const c of categorias) {
    for (const p of c.produtos.slice(1, 3)) {
      if (!map.has(p.id)) {
        map.set(p.id, {
          ...p,
          badge: "Novidade",
          categoriaNome: c.nome,
          categoriaSlug: c.slug,
        });
      }
    }
  }

  return Array.from(map.values());
}

export function ShowcaseCarousel({ produtos }: { produtos: VitrineProduct[] }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = produtos.length;
  const p = produtos[current] || produtos[0];

  function next() {
    if (count <= 1) return;
    setCurrent((prev) => (prev + 1) % count);
  }

  function prev() {
    if (count <= 1) return;
    setCurrent((pIdx) => (pIdx === 0 ? count - 1 : pIdx - 1));
  }

  // Auto-play suave a cada 6 segundos, pausado quando o usuário interage
  useEffect(() => {
    if (isPaused || count <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % count);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, count]);

  if (!p || count === 0) return null;

  const img = imagemPrincipal(p.produto_midias);
  const minPrice = menorPreco(p.faixas_preco);
  const faixasSorted = [...p.faixas_preco].sort((a, b) => a.quantidade_minima - b.quantidade_minima);

  return (
    <section
      aria-label="Vitrine de produtos em destaque no atacado"
      className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-muted/30 shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        setIsPaused(true);
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        setIsPaused(false);
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - (e.changedTouches[0]?.clientX ?? 0);
        if (diff > 40) next();
        if (diff < -40) prev();
        touchStartX.current = null;
      }}
    >
      {/* Topo da vitrine com identificação e controles discretos */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="size-3.5" /> Vitrine de Destaques da Fábrica
          </span>
          <span className="hidden sm:inline-block text-xs text-muted-foreground">
            Grade livre • Direto de fábrica
          </span>
        </div>

        {count > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tabular-nums text-muted-foreground" aria-live="polite">
              {current + 1} de {count}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prev}
                aria-label="Produto anterior da vitrine"
                className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-background text-foreground/80 hover:bg-muted hover:text-foreground transition active:scale-95"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Próximo produto da vitrine"
                className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-background text-foreground/80 hover:bg-muted hover:text-foreground transition active:scale-95"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Palco principal do produto em destaque (estilo editorial de vitrine) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 sm:p-6 lg:p-8 items-center">
        {/* Foto do produto em destaque (formato 4:5 harmonioso) */}
        <div className="md:col-span-5 lg:col-span-5 flex justify-center">
          <Link
            to="/produto/$slug"
            params={{ slug: p.slug }}
            className="group/img relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-muted/40 shadow-md transition-all block"
          >
            {img && (
              <img
                src={img}
                alt={p.nome}
                width={800}
                height={1000}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105"
              />
            )}
            {/* Tag flutuante da vitrine */}
            <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-md">
              <Tag className="size-3" /> {p.badge}
            </span>

            {/* Código do modelo */}
            {p.codigo_modelo && (
              <span className="absolute top-3 right-3 z-10 rounded-full bg-background/85 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground backdrop-blur-xs border border-border/50 shadow-xs">
                Ref: {p.codigo_modelo}
              </span>
            )}

            {/* Rodapé da imagem */}
            <span className="absolute bottom-3 inset-x-3 z-10 rounded-xl bg-background/85 px-2.5 py-1 text-[11px] font-medium text-center text-foreground backdrop-blur-xs border border-border/50 shadow-xs">
              Toque para ver cores e tamanhos
            </span>
          </Link>
        </div>

        {/* Informações comerciais, preços no atacado e CTA */}
        <div className="md:col-span-7 lg:col-span-7 space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {p.categoriaNome}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" /> Atacado a partir de 10 peças
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground leading-snug">
              {p.nome}
            </h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Peça campeã de revenda com alta margem para lojistas. Malha nobre com toque macio e acabamento reforçado direto de fábrica. Monte seu pedido misturando modelos, cores e tamanhos.
          </p>

          {/* Bloco de Preços no Atacado */}
          <div className="rounded-2xl border border-border/80 bg-background/90 p-4 space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Preço no atacado a partir de:
              </span>
              {minPrice !== null && (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
                    R$ {money(minPrice)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/ peça</span>
                </div>
              )}
            </div>

            {/* Faixas de desconto progressivo */}
            {faixasSorted.length > 0 && (
              <div className="pt-1 border-t border-border/40">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Tabela progressiva por quantidade total do pedido:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {faixasSorted.map((f) => (
                    <span
                      key={f.quantidade_minima}
                      className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 px-2 py-1 text-xs font-semibold tabular-nums text-foreground"
                    >
                      <span className="text-muted-foreground">{f.quantidade_minima}+ pçs:</span>
                      <span className="text-primary font-bold">R$ {money(f.preco_peca)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button asChild size="lg" className="w-full sm:w-auto font-bold shadow-md">
              <Link to="/produto/$slug" params={{ slug: p.slug }}>
                Montar pedido nesta peça <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/categoria/$slug" params={{ slug: p.categoriaSlug }}>
                Ver toda a categoria {p.categoriaNome}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Trilho de miniaturas da vitrine (permite trocar o destaque com um clique) */}
      {count > 1 && (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Peças selecionadas na vitrine:
            </span>
            <div className="flex items-center gap-1.5">
              {produtos.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setCurrent(dotIdx)}
                  aria-label={`Ver peça ${dotIdx + 1} da vitrine`}
                  aria-current={dotIdx === current ? "true" : undefined}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    dotIdx === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
            {produtos.map((prod, i) => {
              const isActive = i === current;
              const thumbImg = imagemPrincipal(prod.produto_midias);
              const thumbMin = menorPreco(prod.faixas_preco);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-xl border p-1.5 pr-3 text-left transition shrink-0 max-w-[210px] sm:max-w-[230px]",
                    isActive
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs"
                      : "border-border/60 bg-card hover:bg-muted/50 opacity-75 hover:opacity-100",
                  )}
                >
                  <div className="aspect-[4/5] size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {thumbImg && (
                      <img src={thumbImg} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{prod.nome}</p>
                    {thumbMin !== null && (
                      <p className="text-[11px] font-medium text-primary tabular-nums">
                        a partir de R$ {money(thumbMin)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
