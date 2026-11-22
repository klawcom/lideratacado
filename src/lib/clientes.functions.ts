import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const excluirClientesFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((ids: string[]) => z.array(z.string().uuid()).min(1).parse(ids))
  .handler(async ({ data: ids, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;

    // 1. Busca os clientes para saber se possuem auth user_id
    const { data: clientesRows } = await db.from("clientes").select("id, user_id").in("id", ids);

    // 2. Localiza pedidos vinculados a esses clientes
    const { data: pedidosVinculados } = await db
      .from("pedidos")
      .select("id")
      .in("cliente_id", ids);

    if (pedidosVinculados && pedidosVinculados.length > 0) {
      const pedidoIds = pedidosVinculados.map((p) => p.id);
      // Exclui pagamentos vinculados
      await db.from("pagamentos").delete().in("pedido_id", pedidoIds);
      // Exclui notas internas vinculadas
      await db.from("pedido_notas").delete().in("pedido_id", pedidoIds);
      // Exclui itens vinculados
      await db.from("pedido_itens").delete().in("pedido_id", pedidoIds);
      // Exclui os pedidos
      await db.from("pedidos").delete().in("id", pedidoIds);
    }

    // 3. Exclui os clientes da tabela clientes
    const { error } = await db.from("clientes").delete().in("id", ids);
    if (error) throw new Error(error.message);

    // 4. Se algum cliente tiver user_id em auth (e não for o admin logado), remove a conta auth
    if (clientesRows) {
      for (const row of clientesRows) {
        if (row.user_id && row.user_id !== context.userId) {
          try {
            await db.auth.admin.deleteUser(row.user_id);
          } catch {
            // Ignora se não existir ou já tiver sido removido
          }
        }
      }
    }

    return { success: true, count: ids.length };
  });
