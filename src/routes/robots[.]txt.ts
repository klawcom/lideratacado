import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requestOrigin } = await import("@/lib/public-db.server");
        const origin = requestOrigin(request);
        const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /carrinho\nDisallow: /finalizar\nDisallow: /meus-pedidos\n\nSitemap: ${origin}/sitemap.xml\n`;
        return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
