import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/trocas-e-devolucoes")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => ({
    meta: seo({ title: "Trocas e devoluções | Líder Atacado", description: "Saiba como funcionam as trocas por defeito e as devoluções dos pedidos no atacado.", origin: loaderData?.origin, path: "/trocas-e-devolucoes" }),
    links: canonical(loaderData?.origin, "/trocas-e-devolucoes"),
  }),
  component: () => <InstitucionalPage titulo="Trocas e devoluções" campo="texto_trocas" />,
});
