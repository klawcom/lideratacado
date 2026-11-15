import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { calcularPedido } from "./pricing";
import { linkWhatsapp, montarMensagemPedido } from "./whatsapp-message";
import { faltamPecas, onlyDigits } from "./format";
import { formatarCorTamanhos } from "./colors";

const qtd = z.number().int().min(0).max(100000);

const corQtdSchema = z.object({
  cor: z.string().trim().min(1).max(50),
  qtd: z.object({ p: qtd, m: qtd, g: qtd, gg: qtd }),
});

export const pedidoSchema = z.object({
  cliente: z.object({
    nome: z.string().trim().min(2, "Informe seu nome").max(120),
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
  observacao: z.string().trim().max(500).default(""),
  itens: z
    .array(
      z.object({
        produtoId: z.string().uuid(),
        qtd: z.object({ p: qtd, m: qtd, g: qtd, gg: qtd }),
        cores: z.array(corQtdSchema).optional(),
        observacao: z.string().trim().max(300).default(""),
      }),
    )
    .min(1)
    .max(100),
});

export type PedidoInput = z.input<typeof pedidoSchema>;

export type PedidoCriado = {
  numero: number;
  criadoEm: string;
  mensagem: string;
  waUrl: string;
  resumo: {
    itens: { nome: string; pecas: number; preco: number; valor: number; qtd: { p: number; m: number; g: number; gg: number }; observacao: string }[];
    totalPecas: number;
    faixa: number;
    total: number;
  };
};

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

    const { data: config } = await db.from("configuracoes").select("whatsapp, pedido_minimo").eq("id", 1).single();
    const pedidoMinimo = config?.pedido_minimo ?? 10;

    // Merge repeated products and drop empty lines.
    const merged = new Map<string, (typeof data.itens)[number]>();
    for (const it of data.itens) {
      const cur = merged.get(it.produtoId);
      if (cur) {
        cur.qtd = { p: cur.qtd.p + it.qtd.p, m: cur.qtd.m + it.qtd.m, g: cur.qtd.g + it.qtd.g, gg: cur.qtd.gg + it.qtd.gg };
        cur.observacao = [cur.observacao, it.observacao].filter(Boolean).join(" / ").slice(0, 300);
        if (it.cores?.length) {
          cur.cores = [...(cur.cores || []), ...it.cores];
        }
      } else merged.set(it.produtoId, { ...it, qtd: { ...it.qtd }, cores: it.cores ? [...it.cores] : undefined });
    }
    const itensIn = [...merged.values()].filter((i) => i.qtd.p + i.qtd.m + i.qtd.g + i.qtd.gg > 0);
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

    const { data: pedido, error: pedErr } = await db
      .from("pedidos")
      .insert({
        cliente_id: clienteId,
        user_id: userId,
        total: resumo.total,
        total_pecas: resumo.totalPecas,
        faixa_aplicada: resumo.faixa,
        observacao: data.observacao,
        cliente_nome: c.nome,
        cliente_email: c.email,
        cliente_whatsapp: c.whatsapp,
        rua: c.rua,
        numero_endereco: c.numero,
        complemento: c.complemento,
        bairro: c.bairro,
        cidade: c.cidade,
        estado: c.estado,
        cep: c.cep,
      })
      .select("id, numero, created_at")
      .single();
    if (pedErr) throw new Error(pedErr.message);

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
          qtd_p: i.qtd.p,
          qtd_m: i.qtd.m,
          qtd_g: i.qtd.g,
          qtd_gg: i.qtd.gg,
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
    const mensagem = montarMensagemPedido({
      numero: Number(pedido.numero),
      criadoEm: pedido.created_at,
      itens: itensMsg,
      totalPecas: resumo.totalPecas,
      faixa: resumo.faixa,
      total: resumo.total,
      cliente: { nome: c.nome, email: c.email, whatsapp: c.whatsapp },
      entrega: { rua: c.rua, numero: c.numero, complemento: c.complemento, bairro: c.bairro, cidade: c.cidade, estado: c.estado, cep: c.cep },
      observacao: data.observacao,
    });

    return {
      numero: Number(pedido.numero),
      criadoEm: pedido.created_at,
      mensagem,
      waUrl: linkWhatsapp(config?.whatsapp ?? "5566996444461", mensagem),
      resumo: { itens: itensMsg, totalPecas: resumo.totalPecas, faixa: resumo.faixa, total: resumo.total },
    };
  });
