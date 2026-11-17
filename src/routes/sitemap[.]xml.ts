import { createFileRoute } from "@tanstack/react-router";
import { resolveOrigin } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publicDb, requestOrigin } = await import("@/lib/public-db.server");
        const origin = resolveOrigin(requestOrigin(request));
        const db = publicDb();
        const [{ data: cats }, { data: prods }] = await Promise.all([
          db.from("categorias").select("slug"),
          db.from("produtos").select("slug, updated_at"),
        ]);

        type Entry = { loc: string; lastmod?: string; priority: string; changefreq: string };
        const urls: Entry[] = [
          { loc: "/", priority: "1.0", changefreq: "daily" },
          ...["/como-comprar", "/faq", "/sobre", "/trocas-e-devolucoes", "/privacidade"].map((loc) => ({
            loc,
            priority: "0.6",
            changefreq: "monthly",
          })),
          ...(cats ?? []).map((c) => ({
            loc: `/categoria/${c.slug}`,
            priority: "0.8",
            changefreq: "daily",
          })),
          ...(prods ?? []).map((p) => ({
            loc: `/produto/${p.slug}`,
            lastmod: p.updated_at ? p.updated_at.slice(0, 10) : undefined,
            priority: "0.9",
            changefreq: "daily",
          })),
        ];

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls.map((u) => {
            const parts = [
              `  <url>`,
              `    <loc>${origin}${u.loc}</loc>`,
              u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
              `    <changefreq>${u.changefreq}</changefreq>`,
              `    <priority>${u.priority}</priority>`,
              `  </url>`,
            ].filter(Boolean);
            return parts.join("\n");
          }),
          `</urlset>`,
          "",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
