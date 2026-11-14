import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/como-comprar")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => ({
    meta: seo({ title: "Como comprar no atacado | Líder Atacado", description: "Veja como montar seu pedido por tamanho, enviar pelo WhatsApp e combinar frete e pagamento.", origin: loaderData?.origin, path: "/como-comprar" }),
    links: canonical(loaderData?.origin, "/como-comprar"),
  }),
  component: () => <InstitucionalPage titulo="Como comprar" campo="texto_como_comprar" />,
});
