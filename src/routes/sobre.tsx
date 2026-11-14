import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/sobre")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => ({
    meta: seo({ title: "Sobre a Líder Atacado", description: "Conheça a Líder Atacado: camisetas básicas e camisas polo lisas no atacado para lojistas e revendedores.", origin: loaderData?.origin, path: "/sobre" }),
    links: canonical(loaderData?.origin, "/sobre"),
  }),
  component: () => <InstitucionalPage titulo="Sobre a Líder Atacado" campo="texto_sobre" />,
});
