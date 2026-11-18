import { createFileRoute } from "@tanstack/react-router";
import { extrairDadosWebhook, normalizeInfiniteTag } from "@/lib/infinitepay";
import { confirmarComInfinitePay } from "@/lib/infinitepay.server";

// InfinitePay webhooks are unsigned: every notification is confirmed through payment_check.
export const Route = createFileRoute("/api/public/infinitepay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let details: ReturnType<typeof extrairDadosWebhook>;
        try {
          details = extrairDadosWebhook(await request.json());
        } catch {
          return Response.json({ received: false }, { status: 400 });
        }

        const apiKey = process.env["INFINITEPAY_API_KEY"]?.trim();
        const handle = normalizeInfiniteTag(process.env["INFINITEPAY_HANDLE"] ?? "");
        if (!apiKey || !handle) return Response.json({ received: false }, { status: 503 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin;
          const { data: payment, error } = await db.from("pagamentos").select("*").eq("pedido_id", details.pedidoId).maybeSingle();
          if (error) throw new Error("payment_lookup_failed");
          if (!payment) return Response.json({ received: true, ignored: true });
          const result = await confirmarComInfinitePay(db, { apiKey, handle }, payment, details, "webhook");
          return Response.json({ received: true, status: result.status });
        } catch {
          console.error(`[InfinitePay] Falha ao processar webhook do pedido ${details.pedidoId}`);
          return Response.json({ received: false }, { status: 400 });
        }
      },
    },
  },
});
