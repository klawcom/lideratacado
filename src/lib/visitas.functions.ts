import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { formatarDataIso, type VisitasData } from "./visitas";

const registrarVisitaSchema = z.object({
  isUnique: z.boolean(),
  path: z.string().optional(),
});

export const registrarVisitaFn = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof registrarVisitaSchema>) => registrarVisitaSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      // Ignora rotas do painel administrativo
      if (data.path && data.path.startsWith("/admin")) {
        return { success: false, ignored: true };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: config, error } = await supabaseAdmin
        .from("configuracoes")
        .select("menu_links")
        .eq("id", 1)
        .maybeSingle();

      if (error || !config) return { success: false };

      const ml = (config.menu_links && typeof config.menu_links === "object" && !Array.isArray(config.menu_links)
        ? (config.menu_links as Record<string, unknown>)
        : {}) as Record<string, unknown>;

      const visitasRaw = (ml["visitas"] && typeof ml["visitas"] === "object"
        ? (ml["visitas"] as Record<string, unknown>)
        : {}) as VisitasData;

      const hoje = formatarDataIso(new Date());
      const dias = { ...(visitasRaw.dias ?? {}) };
      const diaAtual = dias[hoje] ?? { visitas: 0, pageviews: 0 };

      dias[hoje] = {
        visitas: Number(diaAtual.visitas || 0) + (data.isUnique ? 1 : 0),
        pageviews: Number(diaAtual.pageviews || 0) + 1,
      };

      // Limita o histórico diário guardado a 90 dias para manter os dados enxutos
      const chavesDias = Object.keys(dias).sort();
      if (chavesDias.length > 90) {
        for (const k of chavesDias.slice(0, chavesDias.length - 90)) {
          delete dias[k];
        }
      }

      const totalVisitas = Number(visitasRaw.total || 0) + (data.isUnique ? 1 : 0);
      const totalPageviews = Number(visitasRaw.totalPageviews || 0) + 1;

      const novoVisitas: VisitasData = {
        total: totalVisitas,
        totalPageviews,
        dias,
        updated_at: new Date().toISOString(),
      };

      const novoMenuLinks = {
        ...ml,
        visitas: novoVisitas,
      };

      await supabaseAdmin
        .from("configuracoes")
        .update({ menu_links: novoMenuLinks })
        .eq("id", 1);

      return { success: true };
    } catch (err) {
      console.warn("[Visitas] Falha ao registrar visita:", err);
      return { success: false };
    }
  });
