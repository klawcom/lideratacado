import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  INFINITEPAY_API_BASE,
  pagamentoConfirmado,
  paymentCheckResponseSchema,
  type InfinitePayConfig,
  type PagamentoStatus,
} from "./infinitepay";

export type AdminDb = SupabaseClient<Database>;
export type PaymentRow = Database["public"]["Tables"]["pagamentos"]["Row"];

export async function postInfinitePay(config: InfinitePayConfig, path: "/links" | "/payment_check", body: unknown): Promise<unknown> {
  const response = await fetch(`${INFINITEPAY_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKey,
    },
    body: JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    console.error(`[InfinitePay] ${path} respondeu HTTP ${response.status}`);
    throw new Error("A InfinitePay não conseguiu processar a solicitação.");
  }
  try {
    return await response.json();
  } catch {
    throw new Error("A InfinitePay retornou uma resposta inválida.");
  }
}

export type ConfirmacaoInput = {
  pedidoId: string;
  invoiceSlug: string;
  transactionNsu: string;
  receiptUrl?: string | undefined;
};

export type ConfirmacaoResult = { status: PagamentoStatus; confirmed: boolean };

export async function confirmarComInfinitePay(
  db: AdminDb,
  config: InfinitePayConfig,
  payment: PaymentRow,
  input: ConfirmacaoInput,
  origem: "webhook" | "retorno" | "admin",
): Promise<ConfirmacaoResult> {
  if (payment.pedido_id !== input.pedidoId || payment.order_nsu !== input.pedidoId) {
    throw new Error("A cobrança não corresponde ao pedido informado.");
  }
  if (payment.status === "pago") return { status: "pago", confirmed: true };

  try {
    const raw = await postInfinitePay(config, "/payment_check", {
      handle: config.handle,
      order_nsu: payment.order_nsu,
      transaction_nsu: input.transactionNsu,
      slug: input.invoiceSlug,
    });
    const checked = paymentCheckResponseSchema.parse(raw);
    const now = new Date().toISOString();

    if (!pagamentoConfirmado(checked, payment.amount)) {
      const { error } = await db.from("pagamentos").update({
        status: "pendente",
        invoice_slug: input.invoiceSlug,
        transaction_nsu: input.transactionNsu,
        last_checked_at: now,
        last_error: null,
      }).eq("id", payment.id).neq("status", "pago");
      if (error) throw new Error("Não foi possível registrar a consulta do pagamento.");
      return { status: "pendente", confirmed: false };
    }

    const { error } = await db.from("pagamentos").update({
      status: "pago",
      invoice_slug: input.invoiceSlug,
      transaction_nsu: input.transactionNsu,
      receipt_url: input.receiptUrl ?? payment.receipt_url,
      paid_amount: checked.paid_amount ?? null,
      installments: checked.installments ?? null,
      capture_method: checked.capture_method ?? null,
      last_checked_at: now,
      paid_at: now,
      last_error: null,
    }).eq("id", payment.id);
    if (error) throw new Error("Não foi possível registrar a confirmação do pagamento.");

    const { error: orderError } = await db.from("pedidos").update({ status: "pago" })
      .eq("id", payment.pedido_id)
      .in("status", ["novo", "em_atendimento"]);
    if (orderError) throw new Error("Não foi possível atualizar o status do pedido.");

    const { error: eventError } = await db.from("pagamento_eventos").upsert({
      pagamento_id: payment.id,
      evento: origem,
      transaction_nsu: input.transactionNsu,
      confirmado: true,
    }, { onConflict: "pagamento_id,evento,transaction_nsu", ignoreDuplicates: true });
    if (eventError) throw new Error("Não foi possível registrar o evento de pagamento.");

    return { status: "pago", confirmed: true };
  } catch (error) {
    await db.from("pagamentos").update({
      status: "erro",
      last_checked_at: new Date().toISOString(),
      last_error: "Falha ao consultar ou registrar a confirmação. Uma nova verificação pode ser feita.",
    }).eq("id", payment.id).neq("status", "pago");
    throw error;
  }
}
