import { createFileRoute } from "@tanstack/react-router";

// Product photos/videos live in a private bucket; this route hands out short-lived signed links.
export const Route = createFileRoute("/api/public/midia/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = decodeURIComponent(params._splat ?? "");
        if (!path || path.includes("..") || path.startsWith("/") || path.length > 300) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("produtos").createSignedUrl(path, 60 * 60 * 6);
        if (error || !data?.signedUrl) return new Response("Not found", { status: 404 });
        let target = data.signedUrl;
        const publicBase = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "");
        if (publicBase) {
          const u = new URL(target);
          target = publicBase + u.pathname + u.search;
        }
        return new Response(null, {
          status: 302,
          headers: { Location: target, "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
