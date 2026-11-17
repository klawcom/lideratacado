import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, schemaBreadcrumbs, seo } from "@/lib/seo";

export const Route = createFileRoute("/trocas-e-devolucoes")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => {
    const crumbs = schemaBreadcrumbs(
      [
        { name: "Início", path: "/" },
        { name: "Trocas e Devoluções", path: "/trocas-e-devolucoes" },
      ],
      loaderData?.origin
    );
    return {
      meta: seo({
        title: "Trocas e Devoluções | Líder Atacado",
        description:
          "Regras e prazos para trocas por defeito de confecção e devolução conforme o Código de Defesa do Consumidor na Líder Atacado.",
        origin: loaderData?.origin,
        path: "/trocas-e-devolucoes",
      }),
      links: canonical(loaderData?.origin, "/trocas-e-devolucoes"),
      scripts: [{ type: "application/ld+json", children: JSON.stringify(crumbs) }],
    };
  },
  component: () => <InstitucionalPage titulo="Trocas e Devoluções" campo="texto_trocas" />,
});
