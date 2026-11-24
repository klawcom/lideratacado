import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProdutoCard } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { menorPreco } from "@/lib/pricing";
import { money } from "@/lib/format";
import seloBlackFridayImg from "@/assets/selo-black-friday.webp";

/**
 * Seleciona os produtos para o carrossel no topo da página:
 * 1. Os mais vendidos (destaque = true)
 * 2. 1 produto representante de cada categoria ativa
 * 3. As novidades (produtos seguintes de cada categoria)
 * Deduplica para que cada peça apareça apenas uma vez.
 */
export function buildVitrineProducts(
  categorias: { id?: string | number; nome: string; slug: string; produtos: ProdutoCard[] }[],
): ProdutoCard[] {
  const map = new Map<string, ProdutoCard>();

  // 1. Mais Vendidos (destaque = true)
  for (const c of categorias) {
    for (const p of c.produtos) {
      if (p.destaque && !map.has(p.id)) {
        map.set(p.id, p);
      }
    }
  }

  // 2. 1 de cada categoria
  for (const c of categorias) {
    const first = c.produtos[0];
    if (first && !map.has(first.id)) {
      map.set(first.id, first);
    }
  }

  // 3. Novidades da coleção (itens seguintes de cada categoria)
  for (const c of categorias) {
    for (const p of c.produtos.slice(1, 4)) {
      if (!map.has(p.id)) {
        map.set(p.id, p);
      }
    }
  }

  return Array.from(map.values());
}

export function ShowcaseCarousel({
  produtos,
  exibirSelo = false,
  seloUrl,
}: {
  produtos: ProdutoCard[];
  exibirSelo?: boolean;
  seloUrl?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const seloSrc = seloUrl || seloBlackFridayImg;

  if (produtos.length === 0) return null;

  function scroll(direction: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const scrollStep = el.clientWidth * 0.9;
    const maxScroll = el.scrollWidth - el.clientWidth;

    let target: number;
    if (direction === "right") {
      target = el.scrollLeft >= maxScroll - 20 ? 0 : el.scrollLeft + scrollStep;
    } else {
      target = el.scrollLeft <= 20 ? maxScroll : el.scrollLeft - scrollStep;
    }

    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: target, behavior: "smooth" });
    } else {
      el.scrollLeft = target;
    }
  }

  // Rotação automática suave a cada 5 segundos se houver mais de 4 produtos
  useEffect(() => {
    if (isPaused || produtos.length <= 4) return;
    const timer = setInterval(() => {
      scroll("right");
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, produtos.length]);

  return (
    <section
      aria-label="Carrossel de produtos em destaque no atacado"
      className="relative group my-2 sm:my-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Cabeçalho com identificação e botões de navegação */}
      <div className="flex items-end justify-between mb-3 sm:mb-4 px-0.5">
        <div>
          <h2 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Destaques da Coleção
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Mais vendidos e novidades no atacado direto de fábrica • A partir de 10 peças
          </p>
        </div>

        {produtos.length > 4 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Produtos anteriores"
              className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground/80 hover:bg-muted hover:text-foreground shadow-xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Próximos produtos"
              className="flex size-9 sm:size-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground/80 hover:bg-muted hover:text-foreground shadow-xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>

      {/* Área do Carrossel de Produtos */}
      <div className="relative">
        {/* Setas flutuantes laterais para desktop */}
        {produtos.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Rolar para esquerda"
              className="hidden lg:flex absolute -left-4 top-[38%] -translate-y-1/2 z-20 size-11 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="size-6" />
            </button>

            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Rolar para direita"
              className="hidden lg:flex absolute -right-4 top-[38%] -translate-y-1/2 z-20 size-11 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}

        {/* Trilho horizontal com 4 produtos por vez no desktop e 2 no mobile */}
        <div
          ref={trackRef}
          className="no-scrollbar flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto snap-x snap-mandatory overscroll-x-contain py-1"
        >
          {produtos.map((p, i) => {
            const img = imagemPrincipal(p.produto_midias);
            const min = menorPreco(p.faixas_preco);
            return (
              <div
                key={p.id}
                className="w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-15px)] shrink-0 snap-start"
              >
                <Link
                  to="/produto/$slug"
                  params={{ slug: p.slug }}
                  className="group/card flex min-w-0 flex-col"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl sm:rounded-3xl bg-muted border border-border/50 shadow-2xs">
                    {img && (
                      <img
                        src={img}
                        alt={p.nome}
                        width={600}
                        height={750}
                        loading={i < 4 ? "eager" : "lazy"}
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
                      />
                    )}
                    {exibirSelo && (
                      <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 select-none drop-shadow-md transition-transform duration-300 group-hover/card:scale-105 sm:right-2.5 sm:top-2.5">
                        <img
                          src={seloSrc}
                          alt="Selo Promocional"
                          width={160}
                          height={107}
                          className="h-8 w-auto sm:h-11 md:h-12 object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 min-w-0 space-y-0.5 px-0.5">
                    <h3 className="line-clamp-2 font-sans text-[14px] sm:text-[15px] font-semibold leading-snug tracking-normal uppercase text-foreground">
                      {p.nome}
                    </h3>
                    {min !== null && (
                      <p className="text-sm text-muted-foreground">
                        a partir de <span className="font-semibold text-foreground">R$ {money(min)}</span> por peça
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
