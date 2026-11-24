import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { calcularPedido, pecas, type Qtd } from "./pricing";
import { linkWhatsapp, montarMensagemPedido } from "./whatsapp-message";
import { faltamPecas, formatWhatsappIntl, maskCpf, money, onlyDigits, validarCpf } from "./format";
import { formatarCorTamanhos } from "./colors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const qtd = z.number().int().min(0).max(100000).default(0);

const corQtdSchema = z.object({
  cor: z.string().trim().min(1).max(50),
  qtd: z.object({
    p: qtd.optional().default(0),
    m: qtd.optional().default(0),
    g: qtd.optional().default(0),
    gg: qtd.optional().default(0),
    g1: qtd.optional().default(0),
    g2: qtd.optional().default(0),
  }),
});

export const pedidoSchema = z.object({
  idempotencyKey: z.string().uuid(),
  formaPagamento: z.enum(["whatsapp", "infinitepay"]).default("whatsapp"),
  cliente: z.object({
    nome: z.string().trim().min(2, "Informe seu nome").max(120),
    cpf: z
      .string()
      .transform(onlyDigits)
      .refine(validarCpf, "CPF inválido. Informe os 11 dígitos para etiqueta e envio."),
    email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
    whatsapp: z
      .string()
      .transform(onlyDigits)
      .refine((v) => v.length === 10 || v.length === 11, "WhatsApp inválido"),
    cep: z
      .string()
      .transform(onlyDigits)
      .refine((v) => v.length === 8, "CEP inválido"),
    rua: z.string().trim().min(2, "Informe a rua").max(200),
    numero: z.string().trim().min(1, "Informe o número").max(20),
    complemento: z.string().trim().max(100).default(""),
    bairro: z.string().trim().min(2, "Informe o bairro").max(120),
    cidade: z.string().trim().min(2, "Informe a cidade").max(120),
    estado: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF inválida"),
  }),
  frete: z.object({
    servico: z.string().trim().min(1, "Selecione uma opção de frete"),
    preco: z.number().min(0),
    prazo: z.string().trim().min(1),
  }),
  dropshipping: z
    .object({
      destinatarioNome: z.string().trim().min(2, "Informe o nome do destinatário").max(120),
      destinatarioCpf: z.string().transform(onlyDigits).optional(),
      destinatarioWhatsapp: z.string().transform(onlyDigits).optional(),
      cep: z
        .string()
        .transform(onlyDigits)
        .refine((v) => v.length === 8, "CEP do destinatário inválido"),
      rua: z.string().trim().min(2, "Informe a rua de entrega").max(200),
      numero: z.string().trim().min(1, "Informe o número").max(20),
      complemento: z.string().trim().max(100).default(""),
      bairro: z.string().trim().min(2, "Informe o bairro").max(120),
      cidade: z.string().trim().min(2, "Informe a cidade").max(120),
      estado: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2}$/, "UF inválida"),
    })
    .optional(),
  substituicaoCores: z.enum(["contato", "sortidas"]).optional().default("contato"),
  observacao: z.string().trim().max(500).default(""),
  itens: z
    .array(
      z.object({
        produtoId: z.string().uuid(),
        qtd: z.object({
          p: qtd.optional().default(0),
          m: qtd.optional().default(0),
          g: qtd.optional().default(0),
          gg: qtd.optional().default(0),
          g1: qtd.optional().default(0),
          g2: qtd.optional().default(0),
        }),
        cores: z.array(corQtdSchema).optional(),
        observacao: z.string().trim().max(300).default(""),
      }),
    )
    .min(1)
    .max(100),
});

export type PedidoInput = z.input<typeof pedidoSchema>;

export type PedidoCriado = {
  id: string;
  checkoutKey: string;
  formaPagamento: "whatsapp" | "infinitepay";
  numero: number;
  criadoEm: string;
  mensagem: string;
  waUrl: string;
  cliente: { nome: string; email: string; whatsapp: string; cpf?: string | undefined };
  entrega: {
    rua: string;
    numero: string;
    complemento?: string | undefined;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    isDropshipping?: boolean | undefined;
    destinatario?: string | undefined;
    cpfDestinatario?: string | undefined;
    whatsappDestinatario?: string | undefined;
  };
  frete?: {
    servico: string;
    preco: number;
    prazo: string;
  } | undefined;
  observacao?: string | undefined;
  resumo: {
    itens: { nome: string; codigo?: string | undefined; pecas: number; preco: number; valor: number; qtd?: Qtd | undefined; observacao?: string | undefined }[];
    totalPecas: number;
    faixa: number;
    total: number;
  };
};

type PedidoComItens = Database["public"]["Tables"]["pedidos"]["Row"] & {
  pedido_itens: Database["public"]["Tables"]["pedido_itens"]["Row"][];
};

function montarRetornoExistente(
  pedido: PedidoComItens,
  data: z.output<typeof pedidoSchema>,
  whatsappLoja: string,
): PedidoCriado {
  const itens = pedido.pedido_itens.map((item) => {
    const qtd = { p: item.qtd_p, m: item.qtd_m, g: item.qtd_g, gg: item.qtd_gg };
    return {
      nome: item.produto_nome,
      codigo: item.codigo_modelo,
      pecas: pecas(qtd) || Math.round(Number(item.valor) / Number(item.preco_unitario)),
      preco: Number(item.preco_unitario),
      valor: Number(item.valor),
      qtd,
      observacao: item.observacao,
    };
  });
  const isDropshipping = pedido.observacao.includes("[DROPSHIPPING]");
  const entrega = {
    rua: pedido.rua,
    numero: pedido.numero_endereco,
    complemento: pedido.complemento,
    bairro: pedido.bairro,
    cidade: pedido.cidade,
    estado: pedido.estado,
    cep: pedido.cep,
    isDropshipping,
    destinatario: isDropshipping ? data.dropshipping?.destinatarioNome : undefined,
    cpfDestinatario: isDropshipping ? data.dropshipping?.destinatarioCpf : undefined,
    whatsappDestinatario: isDropshipping ? data.dropshipping?.destinatarioWhatsapp : undefined,
  };
  const cliente = {
    nome: pedido.cliente_nome,
    email: pedido.cliente_email,
    whatsapp: pedido.cliente_whatsapp,
    cpf: data.cliente.cpf,
  };
  const mensagem = montarMensagemPedido({
    numero: Number(pedido.numero),
    criadoEm: pedido.created_at,
    itens,
    totalPecas: pedido.total_pecas,
    faixa: pedido.faixa_aplicada,
    total: Number(pedido.total),
    frete: data.frete,
    cliente,
    entrega,
    substituicaoCores: data.substituicaoCores,
    observacao: data.observacao,
  });
  return {
    id: pedido.id,
    checkoutKey: data.idempotencyKey,
    formaPagamento: pedido.forma_pagamento === "infinitepay" ? "infinitepay" : "whatsapp",
    numero: Number(pedido.numero),
    criadoEm: pedido.created_at,
    mensagem,
    waUrl: linkWhatsapp(whatsappLoja, mensagem),
    cliente,
    entrega,
    frete: data.frete,
    observacao: data.observacao,
    resumo: {
      itens,
      totalPecas: pedido.total_pecas,
      faixa: pedido.faixa_aplicada,
      total: Number(pedido.total),
    },
  };
}

export const criarPedido = createServerFn({ method: "POST" })
  .validator((d: PedidoInput) => pedidoSchema.parse(d))
  .handler(async ({ data }): Promise<PedidoCriado> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;

    // Optional signed-in caller: identity comes only from a validated bearer token.
    let userId: string | null = null;
    let userEmail: string | null = null;
    const auth = getRequest()?.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const { data: u } = await db.auth.getUser(auth.slice(7));
      if (u?.user) {
        userId = u.user.id;
        userEmail = u.user.email?.toLowerCase() ?? null;
      }
    }

    const { data: config } = await db.from("configuracoes").select("whatsapp, pedido_minimo, menu_links, email_contato").eq("id", 1).single();
    const pedidoMinimo = config?.pedido_minimo ?? 10;

    const { data: pedidoExistente } = await db.from("pedidos").select("*, pedido_itens(*)")
      .eq("idempotency_key", data.idempotencyKey).maybeSingle();
    if (pedidoExistente) return montarRetornoExistente(pedidoExistente, data, config?.whatsapp ?? "5566996444461");

    // Merge repeated products and drop empty lines.
    const merged = new Map<string, (typeof data.itens)[number]>();
    for (const it of data.itens) {
      const cur = merged.get(it.produtoId);
      if (cur) {
        cur.qtd = {
          p: (cur.qtd.p || 0) + (it.qtd.p || 0),
          m: (cur.qtd.m || 0) + (it.qtd.m || 0),
          g: (cur.qtd.g || 0) + (it.qtd.g || 0),
          gg: (cur.qtd.gg || 0) + (it.qtd.gg || 0),
          g1: (cur.qtd.g1 || 0) + (it.qtd.g1 || 0),
          g2: (cur.qtd.g2 || 0) + (it.qtd.g2 || 0),
        };
        cur.observacao = [cur.observacao, it.observacao].filter(Boolean).join(" / ").slice(0, 300);
        if (it.cores?.length) {
          cur.cores = [...(cur.cores || []), ...it.cores];
        }
      } else merged.set(it.produtoId, { ...it, qtd: { ...it.qtd }, cores: it.cores ? [...it.cores] : undefined });
    }
    const itensIn = [...merged.values()].filter((i) => pecas(i.qtd) > 0);
    if (itensIn.length === 0) throw new Error("Seu pedido está vazio.");

    const { data: produtos, error: pErr } = await db
      .from("produtos")
      .select("id, nome, codigo_modelo, ativo, faixas_preco(quantidade_minima, preco_peca)")
      .in("id", itensIn.map((i) => i.produtoId));
    if (pErr) throw new Error(pErr.message);
    const byId = new Map((produtos ?? []).filter((p) => p.ativo).map((p) => [p.id, p]));
    const faltando = itensIn.filter((i) => !byId.has(i.produtoId));
    if (faltando.length) throw new Error("Algum produto do pedido não está mais disponível. Revise o carrinho.");

    const resumo = calcularPedido(
      itensIn.map((i) => {
        const p = byId.get(i.produtoId)!;
        return {
          ...i,
          nome: p.nome,
          codigo: p.codigo_modelo,
          faixas: p.faixas_preco.map((f) => ({ quantidade_minima: f.quantidade_minima, preco_peca: Number(f.preco_peca) })),
        };
      }),
      pedidoMinimo,
    );
    if (!resumo.podeFinalizar) {
      throw new Error(`O pedido mínimo é de ${pedidoMinimo} peças. ${faltamPecas(resumo.faltamMinimo)}.`);
    }

    const c = data.cliente;
    const endereco = {
      nome: c.nome,
      whatsapp: c.whatsapp,
      rua: c.rua,
      numero: c.numero,
      complemento: c.complemento,
      bairro: c.bairro,
      cidade: c.cidade,
      estado: c.estado,
      cep: c.cep,
    };
    const ownEmail = userEmail !== null && userEmail === c.email;

    // Create or update the customer by e-mail. A record linked to another account is not overwritten.
    const { data: existente } = await db.from("clientes").select("id, user_id").eq("email", c.email).maybeSingle();
    let clienteId: string;
    if (existente) {
      clienteId = existente.id;
      if (!existente.user_id || existente.user_id === userId) {
        const { error } = await db
          .from("clientes")
          .update({ ...endereco, ...(ownEmail && !existente.user_id ? { user_id: userId } : {}) })
          .eq("id", existente.id);
        if (error) throw new Error(error.message);
      }
    } else {
      const { data: novo, error } = await db
        .from("clientes")
        .insert({ ...endereco, email: c.email, user_id: ownEmail ? userId : null })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      clienteId = novo.id;
    }

    const valorFrete = data.frete?.preco ?? 0;
    const totalComFrete = Math.round((resumo.total + valorFrete) * 100) / 100;
    const cpfObs = c.cpf ? `CPF: ${maskCpf(c.cpf)}` : "";
    const freteObs = data.frete
      ? `Frete: ${data.frete.servico} (R$ ${money(data.frete.preco)} - ${data.frete.prazo})`
      : "";
    const dropObs = data.dropshipping
      ? `[DROPSHIPPING] Destinatário: ${data.dropshipping.destinatarioNome}${data.dropshipping.destinatarioCpf ? ` (CPF: ${maskCpf(data.dropshipping.destinatarioCpf)})` : ""}${data.dropshipping.destinatarioWhatsapp ? ` (Tel: ${formatWhatsappIntl(data.dropshipping.destinatarioWhatsapp)})` : ""}`
      : "";
    const corConsentObs = "[Cores: Conforme estoque / sortidas na falta]";
    const observacaoFinal = [dropObs, corConsentObs, cpfObs, freteObs, data.observacao].filter(Boolean).join(" | ").slice(0, 500);

    const entregaDestino = data.dropshipping
      ? {
          rua: data.dropshipping.rua,
          numero: data.dropshipping.numero,
          complemento: data.dropshipping.complemento || "",
          bairro: data.dropshipping.bairro,
          cidade: data.dropshipping.cidade,
          estado: data.dropshipping.estado,
          cep: data.dropshipping.cep,
        }
      : {
          rua: c.rua,
          numero: c.numero,
          complemento: c.complemento || "",
          bairro: c.bairro,
          cidade: c.cidade,
          estado: c.estado,
          cep: c.cep,
        };

    const { data: pedido, error: pedErr } = await db
      .from("pedidos")
      .insert({
        idempotency_key: data.idempotencyKey,
        forma_pagamento: data.formaPagamento,
        cliente_id: clienteId,
        user_id: userId,
        total: totalComFrete,
        total_pecas: resumo.totalPecas,
        faixa_aplicada: resumo.faixa,
        observacao: observacaoFinal,
        cliente_nome: c.nome,
        cliente_email: c.email,
        cliente_whatsapp: c.whatsapp,
        rua: entregaDestino.rua,
        numero_endereco: entregaDestino.numero,
        complemento: entregaDestino.complemento,
        bairro: entregaDestino.bairro,
        cidade: entregaDestino.cidade,
        estado: entregaDestino.estado,
        cep: entregaDestino.cep,
      })
      .select("id, numero, created_at")
      .single();
    if (pedErr) {
      if (pedErr.code === "23505") {
        const { data: existente } = await db.from("pedidos").select("*, pedido_itens(*)")
          .eq("idempotency_key", data.idempotencyKey).maybeSingle();
        if (existente) return montarRetornoExistente(existente, data, config?.whatsapp ?? "5566996444461");
      }
      throw new Error(pedErr.message);
    }

    const { error: itErr } = await db.from("pedido_itens").insert(
      resumo.itens.map((i) => {
        const itIn = itensIn.find((x) => x.produtoId === i.produtoId);
        const coresTexto = itIn?.cores?.map((c) => formatarCorTamanhos(c.cor, c.qtd)).filter(Boolean).join(" | ");
        const obsFinal = [coresTexto, i.observacao].filter(Boolean).join(" — ").slice(0, 300);
        return {
          pedido_id: pedido.id,
          produto_id: i.produtoId,
          produto_nome: i.nome,
          codigo_modelo: i.codigo,
          qtd_p: i.qtd.p || 0,
          qtd_m: i.qtd.m || 0,
          qtd_g: i.qtd.g || 0,
          qtd_gg: i.qtd.gg || 0,
          preco_unitario: i.preco,
          valor: i.valor,
          observacao: obsFinal,
        };
      }),
    );
    if (itErr) {
      await db.from("pedidos").delete().eq("id", pedido.id);
      throw new Error(itErr.message);
    }

    const itensMsg = resumo.itens.map((i) => {
      const itIn = itensIn.find((x) => x.produtoId === i.produtoId);
      return {
        nome: i.nome,
        pecas: i.pecas,
        preco: i.preco,
        valor: i.valor,
        qtd: i.qtd,
        cores: itIn?.cores,
        observacao: i.observacao,
      };
    });

    const entregaMsg = data.dropshipping
      ? {
          rua: data.dropshipping.rua,
          numero: data.dropshipping.numero,
          complemento: data.dropshipping.complemento,
          bairro: data.dropshipping.bairro,
          cidade: data.dropshipping.cidade,
          estado: data.dropshipping.estado,
          cep: data.dropshipping.cep,
          isDropshipping: true,
          destinatario: data.dropshipping.destinatarioNome,
          cpfDestinatario: data.dropshipping.destinatarioCpf,
          whatsappDestinatario: data.dropshipping.destinatarioWhatsapp,
        }
      : {
          rua: c.rua,
          numero: c.numero,
          complemento: c.complemento,
          bairro: c.bairro,
          cidade: c.cidade,
          estado: c.estado,
          cep: c.cep,
        };

    const mensagem = montarMensagemPedido({
      numero: Number(pedido.numero),
      criadoEm: pedido.created_at,
      itens: itensMsg,
      totalPecas: resumo.totalPecas,
      faixa: resumo.faixa,
      total: totalComFrete,
      frete: data.frete,
      cliente: { nome: c.nome, email: c.email, whatsapp: c.whatsapp, cpf: c.cpf },
      entrega: entregaMsg,
      substituicaoCores: data.substituicaoCores,
      observacao: data.observacao,
    });

    // Dispara notificação por e-mail em background (não bloqueia resposta ao cliente)
    void (async () => {
      try {
        let resendApiKey: string | undefined;
        if (config?.menu_links && typeof config.menu_links === "object" && !Array.isArray(config.menu_links)) {
          const resendCfg = (config.menu_links as Record<string, unknown>)["resend"] as
            | { api_key?: string }
            | undefined;
          if (resendCfg?.api_key) resendApiKey = resendCfg.api_key.trim();
        }

        const { enviarEmailNovoPedido } = await import("./order-email");
        await enviarEmailNovoPedido({
          numero: Number(pedido.numero),
          criadoEm: pedido.created_at,
          formaPagamento: data.formaPagamento,
          total: totalComFrete,
          totalPecas: resumo.totalPecas,
          faixa: resumo.faixa,
          frete: data.frete,
          cliente: { nome: c.nome, email: c.email, whatsapp: c.whatsapp, cpf: c.cpf },
          entrega: entregaMsg,
          itens: itensMsg,
          observacao: data.observacao,
          emailLoja: config?.email_contato || "lideratacado8@gmail.com",
          apiKey: resendApiKey,
        });
      } catch (err) {
        console.error("[Email Notificacao] Erro ao disparar e-mail de novo pedido:", err);
      }
    })();

    return {
      id: pedido.id,
      checkoutKey: data.idempotencyKey,
      formaPagamento: data.formaPagamento,
      numero: Number(pedido.numero),
      criadoEm: pedido.created_at,
      mensagem,
      waUrl: linkWhatsapp(config?.whatsapp ?? "5566996444461", mensagem),
      cliente: { nome: c.nome, email: c.email, whatsapp: c.whatsapp, cpf: c.cpf },
      entrega: entregaMsg,
      frete: data.frete,
      observacao: data.observacao,
      resumo: {
        itens: itensMsg.map((it, idx) => ({ ...it, codigo: resumo.itens[idx]?.codigo })),
        totalPecas: resumo.totalPecas,
        faixa: resumo.faixa,
        total: totalComFrete,
      },
    };
  });

export const excluirPedidosFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((ids: string[]) => z.array(z.string().uuid()).min(1).parse(ids))
  .handler(async ({ data: ids, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    // 1. Exclui cobranças/pagamentos vinculados (ex: pedidos de teste do administrador)
    await db.from("pagamentos").delete().in("pedido_id", ids);
    // 2. Exclui notas internas vinculadas
    await db.from("pedido_notas").delete().in("pedido_id", ids);
    // 3. Exclui itens vinculados
    await db.from("pedido_itens").delete().in("pedido_id", ids);
    // 4. Exclui os pedidos
    const { error } = await db.from("pedidos").delete().in("id", ids);
    if (error) throw new Error(error.message);
    return { success: true, count: ids.length };
  });

/** Função de teste de envio de e-mail disparada pelo painel administrativo */
export const testarEnvioEmailFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { emailDestino?: string | undefined; apiKey?: string | undefined }) =>
    z.object({ emailDestino: z.string().email().optional(), apiKey: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito ao administrador.");

    const { enviarEmailNovoPedido } = await import("./order-email");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("configuracoes")
      .select("email_contato, whatsapp, menu_links")
      .eq("id", 1)
      .single();

    const emailDestino = data.emailDestino || cfg?.email_contato || "lideratacado8@gmail.com";

    let apiKey = data.apiKey?.trim();
    if (!apiKey && cfg?.menu_links && typeof cfg.menu_links === "object" && !Array.isArray(cfg.menu_links)) {
      const resendCfg = (cfg.menu_links as Record<string, unknown>)["resend"] as
        | { api_key?: string }
        | undefined;
      if (resendCfg?.api_key) apiKey = resendCfg.api_key.trim();
    }

    const res = await enviarEmailNovoPedido({
      numero: 9999,
      criadoEm: new Date().toISOString(),
      formaPagamento: "whatsapp",
      total: 420.0,
      totalPecas: 10,
      faixa: 10,
      frete: {
        servico: "SEDEX (Correios)",
        preco: 25.0,
        prazo: "2 dias úteis",
      },
      cliente: {
        nome: "Cliente de Teste (Simulação de Pedido)",
        email: emailDestino,
        whatsapp: "5511999999999",
      },
      entrega: {
        rua: "Rua de Demonstração",
        numero: "100",
        bairro: "Centro",
        cidade: "São Paulo",
        estado: "SP",
        cep: "01001-000",
      },
      itens: [
        {
          nome: "Camiseta Cotton Pima (Item Simulado)",
          codigo: "TESTE-01",
          pecas: 10,
          preco: 42.0,
          valor: 420.0,
          qtd: { p: 2, m: 4, g: 4, gg: 0, g1: 0, g2: 0 },
          cores: [{ cor: "Preta", qtd: { p: 1, m: 2, g: 2, gg: 0, g1: 0, g2: 0 } }],
        },
      ],
      observacao: "Este é um disparo de teste gerado pelo painel para validar o recebimento de notificações no seu e-mail.",
      emailLoja: emailDestino,
      apiKey,
    });

    return res;
  });
