import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => ({
    meta: seo({ title: "Dúvidas frequentes | Líder Atacado", description: "Pedido mínimo, cores, faixas de preço, frete e pagamento: respostas para as dúvidas mais comuns.", origin: loaderData?.origin, path: "/faq" }),
    links: canonical(loaderData?.origin, "/faq"),
  }),
  component: () => <InstitucionalPage titulo="Dúvidas frequentes" campo="texto_faq" />,
});
