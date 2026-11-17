import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, schemaBreadcrumbs, seo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => {
    const crumbs = schemaBreadcrumbs(
      [
        { name: "Início", path: "/" },
        { name: "Dúvidas Frequentes", path: "/faq" },
      ],
      loaderData?.origin
    );
    return {
      meta: seo({
        title: "Dúvidas Frequentes (FAQ) | Atacado Líder Atacado",
        description:
          "Tire suas dúvidas sobre pedido mínimo a partir de 10 peças, descontos progressivos, escolha de grade livre, frete Correios e pagamento.",
        origin: loaderData?.origin,
        path: "/faq",
      }),
      links: canonical(loaderData?.origin, "/faq"),
      scripts: [{ type: "application/ld+json", children: JSON.stringify(crumbs) }],
    };
  },
  component: () => <InstitucionalPage titulo="Dúvidas Frequentes" campo="texto_faq" />,
});
