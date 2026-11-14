import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publicDb, requestOrigin } = await import("@/lib/public-db.server");
        const origin = requestOrigin(request);
        const db = publicDb();
        const [{ data: cats }, { data: prods }] = await Promise.all([
          db.from("categorias").select("slug"),
          db.from("produtos").select("slug, updated_at"),
        ]);
        const urls: { loc: string; lastmod?: string }[] = [
          { loc: "/" },
          ...["/sobre", "/como-comprar", "/faq", "/trocas-e-devolucoes", "/privacidade"].map((loc) => ({ loc })),
          ...(cats ?? []).map((c) => ({ loc: `/categoria/${c.slug}` })),
          ...(prods ?? []).map((p) => ({ loc: `/produto/${p.slug}`, lastmod: p.updated_at?.slice(0, 10) })),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${origin}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
          .join("\n")}\n</urlset>\n`;
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
      },
    },
  },
});
