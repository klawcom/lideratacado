import { createFileRoute } from "@tanstack/react-router";
import { resolveOrigin } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requestOrigin } = await import("@/lib/public-db.server");
        const origin = resolveOrigin(requestOrigin(request));
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /carrinho",
          "Disallow: /finalizar",
          "Disallow: /meus-pedidos",
          "Disallow: /auth",
          "Disallow: /pedido-confirmado",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
