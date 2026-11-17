import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, schemaBreadcrumbs, seo } from "@/lib/seo";

export const Route = createFileRoute("/privacidade")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => {
    const crumbs = schemaBreadcrumbs(
      [
        { name: "Início", path: "/" },
        { name: "Política de Privacidade", path: "/privacidade" },
      ],
      loaderData?.origin
    );
    return {
      meta: seo({
        title: "Política de Privacidade (LGPD) | Líder Atacado",
        description:
          "Saiba como a Líder Atacado protege, coleta e trata seus dados pessoais em conformidade integral com a Lei Geral de Proteção de Dados (LGPD).",
        origin: loaderData?.origin,
        path: "/privacidade",
      }),
      links: canonical(loaderData?.origin, "/privacidade"),
      scripts: [{ type: "application/ld+json", children: JSON.stringify(crumbs) }],
    };
  },
  component: () => <InstitucionalPage titulo="Política de Privacidade" campo="texto_privacidade" />,
});
