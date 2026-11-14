import { createFileRoute } from "@tanstack/react-router";
import { InstitucionalPage } from "@/components/store/institucional";
import { siteQuery } from "@/lib/catalog.functions";
import { canonical, seo } from "@/lib/seo";

export const Route = createFileRoute("/privacidade")({
  loader: async ({ context }) => ({ origin: (await context.queryClient.ensureQueryData(siteQuery())).origin }),
  head: ({ loaderData }) => ({
    meta: seo({ title: "Política de privacidade (LGPD) | Líder Atacado", description: "Como a Líder Atacado coleta, usa e protege seus dados pessoais, conforme a LGPD.", origin: loaderData?.origin, path: "/privacidade" }),
    links: canonical(loaderData?.origin, "/privacidade"),
  }),
  component: () => <InstitucionalPage titulo="Política de privacidade" campo="texto_privacidade" />,
});
