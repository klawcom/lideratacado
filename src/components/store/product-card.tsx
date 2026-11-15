import { Link } from "@tanstack/react-router";
import type { ProdutoCard as P } from "@/lib/catalog.functions";
import { imagemPrincipal } from "@/lib/media";
import { menorPreco } from "@/lib/pricing";
import { money } from "@/lib/format";

export function ProductCard({ p, eager = false }: { p: P; eager?: boolean }) {
  const img = imagemPrincipal(p.produto_midias);
  const min = menorPreco(p.faixas_preco);
  return (
    <Link to="/produto/$slug" params={{ slug: p.slug }} className="group flex min-w-0 flex-col">
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
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

export function ProductGrid({ produtos }: { produtos: P[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {produtos.map((p, i) => (
        <ProductCard key={p.id} p={p} eager={i < 2} />
      ))}
    </div>
  );
}
