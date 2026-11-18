import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { round2, whatsappLinkNumber } from "./format";
import {
  extrairLinkCobranca,
  montarPayloadCobranca,
  normalizeInfiniteTag,
  pagamentoStatusLabel,
  type PagamentoStatus,
} from "./infinitepay";
import { confirmarComInfinitePay, postInfinitePay } from "./infinitepay.server";

function publicPaymentStatus(status: string): PagamentoStatus {
  return (["pendente", "processando", "pago", "falhou", "cancelado", "estornado", "erro"].includes(status) ? status : "erro") as PagamentoStatus;
}

export const configuracaoInfinitePay = createServerFn({ method: "GET" }).handler(() => {
  const configured = Boolean(process.env["INFINITEPAY_API_KEY"]?.trim() && process.env["INFINITEPAY_HANDLE"]?.trim());
  return { available: configured };
});

const criarCobrancaInput = z.object({ pedidoId: z.string().uuid(), checkoutKey: z.string().uuid() });

export const criarCobrancaInfinitePay = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof criarCobrancaInput>) => criarCobrancaInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["INFINITEPAY_API_KEY"]?.trim();
    const handle = normalizeInfiniteTag(process.env["INFINITEPAY_HANDLE"] ?? "");
    if (!apiKey || !handle) throw new Error("O pagamento online ainda não está disponível. Escolha concluir pelo WhatsApp.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const { data: pedido, error: orderError } = await db.from("pedidos").select("*, pedido_itens(*)")
      .eq("id", data.pedidoId).eq("idempotency_key", data.checkoutKey).maybeSingle();
    if (orderError || !pedido) throw new Error("Não foi possível localizar este checkout. Refaça o pedido.");
    if (pedido.forma_pagamento !== "infinitepay") throw new Error("Este pedido foi registrado para conclusão pelo WhatsApp.");

    const amount = Math.round((Number(pedido.total) + Number.EPSILON) * 100);
    const { data: found, error: paymentError } = await db.from("pagamentos").select("*").eq("pedido_id", pedido.id).maybeSingle();
    if (paymentError) throw new Error("Não foi possível consultar a cobrança.");
    let payment = found;

    if (payment?.status === "pago") return { pedidoId: pedido.id, numero: Number(pedido.numero), status: "pago" as const, paymentUrl: null };
    if (payment?.payment_url) {
      return { pedidoId: pedido.id, numero: Number(pedido.numero), status: publicPaymentStatus(payment.status), paymentUrl: payment.payment_url };
    }

    const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    if (payment) {
      const { data: claimed, error: claimError } = await db.from("pagamentos").update({ status: "processando", last_error: null })
        .eq("id", payment.id).is("payment_url", null).neq("status", "pago")
        .or(`status.neq.processando,updated_at.lt.${stale}`).select("*").maybeSingle();
      if (claimError) throw new Error("Não foi possível iniciar a cobrança.");
      if (!claimed) throw new Error("O link deste pedido já está sendo gerado. Aguarde alguns segundos e tente novamente.");
      payment = claimed;
    } else {
      const { data: inserted, error: insertError } = await db.from("pagamentos").insert({
        pedido_id: pedido.id,
        order_nsu: pedido.id,
        amount,
        status: "processando",
      }).select("*").single();
      if (insertError) {
        const { data: concurrent } = await db.from("pagamentos").select("*").eq("pedido_id", pedido.id).maybeSingle();
        if (concurrent?.payment_url) return { pedidoId: pedido.id, numero: Number(pedido.numero), status: publicPaymentStatus(concurrent.status), paymentUrl: concurrent.payment_url };
        throw new Error("A cobrança já está sendo iniciada. Aguarde e tente novamente.");
      }
      payment = inserted;
    }

    try {
      const itemsTotal = round2(pedido.pedido_itens.reduce((sum, item) => sum + Number(item.valor), 0));
      const frete = round2(Number(pedido.total) - itemsTotal);
      const payload = montarPayloadCobranca({
        handle,
        orderNsu: pedido.id,
        total: Number(pedido.total),
        items: pedido.pedido_itens.map((item) => {
          const sizes = item.qtd_p + item.qtd_m + item.qtd_g + item.qtd_gg;
          const quantity = sizes || Math.round(Number(item.valor) / Number(item.preco_unitario));
          return { description: item.produto_nome, quantity, unitPrice: Number(item.preco_unitario) };
        }),
        frete: frete > 0 ? { description: `Pedido #${pedido.numero}`, price: frete } : undefined,
        customer: {
          name: pedido.cliente_nome,
          email: pedido.cliente_email,
          phoneNumber: `+${whatsappLinkNumber(pedido.cliente_whatsapp)}`,
        },
        address: {
          cep: pedido.cep,
          street: pedido.rua,
          number: pedido.numero_endereco,
          neighborhood: pedido.bairro,
          city: pedido.cidade,
          state: pedido.estado,
          complement: pedido.complemento,
        },
      });
      const raw = await postInfinitePay({ apiKey, handle }, "/links", payload);
      const link = extrairLinkCobranca(raw);
      const { data: saved, error: saveError } = await db.from("pagamentos").update({
        status: "pendente",
        payment_url: link.paymentUrl,
        invoice_slug: link.invoiceSlug,
        last_error: null,
      }).eq("id", payment.id).is("payment_url", null).select("*").single();
      if (saveError || !saved) throw new Error("Não foi possível salvar o link de pagamento.");

      return { pedidoId: pedido.id, numero: Number(pedido.numero), status: "pendente" as const, paymentUrl: saved.payment_url! };
    } catch (error) {
      await db.from("pagamentos").update({ status: "erro", last_error: "Não foi possível gerar o link. Uma nova tentativa pode ser feita." })
        .eq("id", payment.id).is("payment_url", null);
      if (error instanceof Error && error.message.startsWith("O link deste")) throw error;
      throw new Error("Não foi possível gerar o pagamento agora. Tente novamente ou conclua pelo WhatsApp.");
    }
  });

const confirmacaoInput = z.object({
  pedidoId: z.string().uuid(),
  invoiceSlug: z.string().trim().min(1).max(120),
  transactionNsu: z.string().trim().min(1).max(160),
  receiptUrl: z.string().url().max(2048).optional().refine((value) => {
    if (!value) return true;
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "infinitepay.io" || url.hostname.endsWith(".infinitepay.io"));
  }, "Comprovante inválido"),
});

export const confirmarPagamentoInfinitePay = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof confirmacaoInput>) => confirmacaoInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["INFINITEPAY_API_KEY"]?.trim();
    const handle = normalizeInfiniteTag(process.env["INFINITEPAY_HANDLE"] ?? "");
    if (!apiKey || !handle) throw new Error("A confirmação online ainda não está configurada.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const { data: payment, error } = await db.from("pagamentos").select("*").eq("pedido_id", data.pedidoId).maybeSingle();
    if (error || !payment) throw new Error("Cobrança não encontrada.");
    const result = await confirmarComInfinitePay(db, { apiKey, handle }, payment, data, "retorno");
    return { status: result.status, label: pagamentoStatusLabel(result.status) };
  });

export const obterPagamentoCheckout = createServerFn({ method: "POST" })
  .validator((input: z.input<typeof criarCobrancaInput>) => criarCobrancaInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const { data: pedido, error } = await db.from("pedidos").select("id, numero").eq("id", data.pedidoId).eq("idempotency_key", data.checkoutKey).maybeSingle();
    if (error || !pedido) throw new Error("Pedido não encontrado.");
    const { data: payment } = await db.from("pagamentos").select("status, payment_url").eq("pedido_id", pedido.id).maybeSingle();
    return {
      numero: Number(pedido.numero),
      status: publicPaymentStatus(payment?.status ?? "pendente"),
      paymentUrl: payment?.payment_url ?? null,
    };
  });

export const verificarPagamentoAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: pedidoId, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
    const apiKey = process.env["INFINITEPAY_API_KEY"]?.trim();
    const handle = normalizeInfiniteTag(process.env["INFINITEPAY_HANDLE"] ?? "");
    if (!apiKey || !handle) throw new Error("Configure as credenciais da InfinitePay antes de verificar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const { data: payment, error } = await db.from("pagamentos").select("*").eq("pedido_id", pedidoId).maybeSingle();
    if (error || !payment) throw new Error("Cobrança não encontrada.");
    if (!payment.invoice_slug || !payment.transaction_nsu) throw new Error("Ainda não há uma transação para consultar.");
    const result = await confirmarComInfinitePay(db, { apiKey, handle }, payment, {
      pedidoId,
      invoiceSlug: payment.invoice_slug,
      transactionNsu: payment.transaction_nsu,
      receiptUrl: payment.receipt_url ?? undefined,
    }, "admin");
    return { status: result.status, label: pagamentoStatusLabel(result.status) };
  });
