import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/store/product-card";
import { categoriaQuery, siteQuery } from "@/lib/catalog.functions";
import { canonical, schemaBreadcrumbs, seo } from "@/lib/seo";

export const Route = createFileRoute("/categoria/$slug")({
  loader: async ({ context, params }) => {
    const [site, cat] = await Promise.all([
      context.queryClient.ensureQueryData(siteQuery()),
      context.queryClient.ensureQueryData(categoriaQuery(params.slug)),
    ]);
    if (!cat) throw notFound();
    return { origin: site.origin, nome: cat.nome, descricao: cat.descricao, slug: params.slug };
  },
  head: ({ loaderData, params }) => {
    const catName = loaderData?.nome ?? "Categoria";
    const desc = loaderData?.descricao
      ? `${loaderData.descricao} Compre ${catName.toLowerCase()} no atacado a partir de 10 peças com descontos progressivos direto de fábrica.`
      : `${catName} no atacado direto de fábrica a partir de 10 peças. Grade livre de cores e tamanhos, descontos progressivos e envio Correios para todo o Brasil.`;

    const breadcrumbsJson = schemaBreadcrumbs(
      [
        { name: "Início", path: "/" },
        { name: catName, path: `/categoria/${params.slug}` },
      ],
      loaderData?.origin
    );

    return {
      meta: seo({
        title: `${catName} no Atacado Direto de Fábrica | Líder Atacado`,
        description: desc.slice(0, 160),
        origin: loaderData?.origin,
        path: `/categoria/${params.slug}`,
      }),
      links: canonical(loaderData?.origin, `/categoria/${params.slug}`),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(breadcrumbsJson),
        },
      ],
    };
  },
  component: CategoriaPage,
});

function CategoriaPage() {
  const { slug } = Route.useParams();
  const { data: site } = useSuspenseQuery(siteQuery());
  const { data: cat } = useSuspenseQuery(categoriaQuery(slug));
  if (!cat) return null;
  const seloBlackFriday = Boolean(site.home_display?.selo_black_friday);

  return (
    <div className="container-page py-4 sm:py-6 md:py-10">
      {/* Navegação estrutural / Breadcrumbs visíveis */}
      <nav aria-label="Navegação estrutural" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/" className="inline-flex min-h-11 items-center hover:text-foreground">
          Início
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
        <span className="font-semibold text-foreground truncate max-w-[200px]" aria-current="page">
          {cat.nome}
        </span>
      </nav>

      <header className="mb-6 sm:mb-8 mt-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl md:text-4xl text-foreground">{cat.nome} no Atacado</h1>
        {cat.descricao && <p className="mt-2 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">{cat.descricao}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
            {cat.produtos.length} {cat.produtos.length === 1 ? "produto disponível" : "produtos disponíveis"}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
            Pedido mínimo a partir de 10 peças
          </span>
        </div>
      </header>

      {cat.produtos.length ? (
        <ProductGrid produtos={cat.produtos} exibirSelo={seloBlackFriday} />
      ) : (
        <div className="rounded-2xl border bg-muted/40 p-8 text-center text-muted-foreground">
          <p className="font-medium">Nenhum produto cadastrado nesta categoria por enquanto.</p>
          <Button asChild className="mt-4">
            <Link to="/">Ver outras categorias</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
