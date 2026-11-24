import { Link } from "@tanstack/react-router";
import type { ProdutoCard as P } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { menorPreco } from "@/lib/pricing";
import { money } from "@/lib/format";
import seloBlackFridayImg from "@/assets/selo-black-friday.webp";

export function ProductCard({
  p,
  eager = false,
  exibirSelo = false,
  seloUrl,
}: {
  p: P;
  eager?: boolean;
  exibirSelo?: boolean;
  seloUrl?: string | null | undefined;
}) {
  const img = imagemPrincipal(p.produto_midias);
  const min = menorPreco(p.faixas_preco);
  const seloSrc = seloUrl || seloBlackFridayImg;

  return (
    <Link to="/produto/$slug" params={{ slug: p.slug }} className="group flex min-w-0 flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        {img && (
          <img
            src={img}
            alt={p.nome}
            width={600}
            height={750}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {exibirSelo && (
          <div className="pointer-events-none absolute right-1.5 top-1.5 z-10 select-none drop-shadow-md transition-transform duration-300 group-hover:scale-105 sm:right-2 sm:top-2">
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
        <h3 className="line-clamp-2 font-sans text-[15px] font-semibold leading-snug tracking-normal sm:text-base">{p.nome}</h3>
        {min !== null && (
          <p className="text-sm text-muted-foreground">
            a partir de <span className="font-semibold text-foreground">R$ {money(min)}</span> por peça
          </p>
        )}
      </div>
    </Link>
  );
}

export function ProductGrid({
  produtos,
  exibirSelo = false,
  seloUrl,
}: {
  produtos: P[];
  exibirSelo?: boolean;
  seloUrl?: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {produtos.map((p, i) => (
        <ProductCard key={p.id} p={p} eager={i < 2} exibirSelo={exibirSelo} seloUrl={seloUrl} />
      ))}
    </div>
  );
}
