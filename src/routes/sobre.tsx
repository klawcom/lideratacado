import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, schemaBreadcrumbs, seo } from "@/lib/seo";

export const Route = createFileRoute("/sobre")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => {
    const crumbs = schemaBreadcrumbs(
      [
        { name: "Início", path: "/" },
        { name: "Sobre a Líder Atacado", path: "/sobre" },
      ],
      loaderData?.origin
    );
    return {
      meta: seo({
        title: "Sobre a Líder Atacado | Fábrica de Camisetas e Polos no Atacado",
        description:
          "Conheça a Líder Atacado: fornecedora de camisetas básicas em algodão Pima peruano e camisas polo no atacado a partir de 10 peças direto de fábrica.",
        origin: loaderData?.origin,
        path: "/sobre",
      }),
      links: canonical(loaderData?.origin, "/sobre"),
      scripts: [{ type: "application/ld+json", children: JSON.stringify(crumbs) }],
    };
  },
  component: () => <InstitucionalPage titulo="Sobre a Líder Atacado" campo="texto_sobre" />,
});
