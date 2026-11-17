import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, schemaBreadcrumbs, seo } from "@/lib/seo";

export const Route = createFileRoute("/como-comprar")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => {
    const crumbs = schemaBreadcrumbs(
      [
        { name: "Início", path: "/" },
        { name: "Como Comprar", path: "/como-comprar" },
      ],
      loaderData?.origin
    );
    return {
      meta: seo({
        title: "Como Comprar no Atacado | Líder Atacado a partir de 10 peças",
        description:
          "Veja como montar seu pedido de atacado por tamanho e cor, calcular o frete dos Correios e finalizar pelo WhatsApp da Líder Atacado.",
        origin: loaderData?.origin,
        path: "/como-comprar",
      }),
      links: canonical(loaderData?.origin, "/como-comprar"),
      scripts: [{ type: "application/ld+json", children: JSON.stringify(crumbs) }],
    };
  },
  component: () => <InstitucionalPage titulo="Como Comprar no Atacado" campo="texto_como_comprar" />,
});
