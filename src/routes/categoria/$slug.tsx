import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { ProductGrid } from "@/components/store/product-card";
import { categoriaQuery, siteQuery } from "@/lib/catalog.functions";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/categoria/$slug")({
  loader: async ({ context, params }) => {
    const [site, cat] = await Promise.all([
      context.queryClient.ensureQueryData(siteQuery()),
      context.queryClient.ensureQueryData(categoriaQuery(params.slug)),
    ]);
    if (!cat) throw notFound();
    return { origin: site.origin, nome: cat.nome, descricao: cat.descricao };
  },
  head: ({ loaderData, params }) => ({
    meta: seo({
      title: `${loaderData?.nome ?? "Categoria"} no atacado | Líder Atacado`,
      description:
        loaderData?.descricao ||
        `${loaderData?.nome ?? "Produtos"} no atacado a partir de 10 peças, com preço por peça que cai conforme o pedido.`,
      origin: loaderData?.origin,
      path: `/categoria/${params.slug}`,
    }),
    links: canonical(loaderData?.origin, `/categoria/${params.slug}`),
  }),
  component: CategoriaPage,
});

function CategoriaPage() {
  const { slug } = Route.useParams();
  const { data: cat } = useSuspenseQuery(categoriaQuery(slug));
  if (!cat) return null;
  return (
    <div className="container-page py-6 md:py-10">
      <Link to="/" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-5" /> Início
      </Link>
      <header className="mb-8 mt-2">
        <h1 className="text-3xl font-extrabold md:text-4xl">{cat.nome}</h1>
        {cat.descricao && <p className="mt-2 max-w-2xl text-muted-foreground">{cat.descricao}</p>}
        <p className="mt-2 text-sm text-muted-foreground">{cat.produtos.length} produtos</p>
      </header>
      {cat.produtos.length ? (
        <ProductGrid produtos={cat.produtos} />
      ) : (
        <p className="rounded-2xl bg-muted p-8 text-center text-muted-foreground">Nenhum produto nesta categoria por enquanto.</p>
      )}
    </div>
  );
}
