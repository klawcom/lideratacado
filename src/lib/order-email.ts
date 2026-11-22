import { brl, formatDateTime, formatWhatsappIntl, maskCep, maskCpf, padNumero, whatsappLinkNumber } from "./format";
import { TAMANHOS, type Qtd } from "./pricing";
import { formatarCorTamanhos } from "./colors";

export type ItemEmailPedido = {
  nome: string;
  codigo?: string | undefined;
  pecas: number;
  preco: number;
  valor: number;
  qtd: Qtd;
  cores?: { cor: string; qtd: Qtd }[] | undefined;
  observacao?: string | undefined;
};

export type DadosEmailPedido = {
  numero: number;
  criadoEm: string | Date;
  formaPagamento: "whatsapp" | "infinitepay";
  total: number;
  totalPecas: number;
  faixa: number;
  frete?: {
    servico: string;
    preco: number;
    prazo: string;
  } | undefined;
  cliente: {
    nome: string;
    email: string;
    whatsapp: string;
    cpf?: string | undefined;
  };
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
  itens: ItemEmailPedido[];
  observacao?: string | undefined;
  emailLoja?: string | undefined;
};

export function gerarHtmlEmailPedido(p: DadosEmailPedido): string {
  const { data, hora } = formatDateTime(p.criadoEm);
  const numFormatado = padNumero(p.numero);
  const waClienteClean = whatsappLinkNumber(p.cliente.whatsapp);
  const waClienteLink = `https://wa.me/${waClienteClean}`;
  const isDrop = !!p.entrega.isDropshipping;
  const isOnline = p.formaPagamento === "infinitepay";

  const itensHtml = p.itens
    .map((it) => {
      const grades = TAMANHOS.filter((t) => (it.qtd[t.key] || 0) > 0)
        .map((t) => `<strong>${t.label}:</strong> ${it.qtd[t.key]}`)
        .join(" &nbsp;|&nbsp; ");

      const coresTexto = it.cores?.length
        ? it.cores.map((c) => formatarCorTamanhos(c.cor, c.qtd)).filter(Boolean).join(" &bull; ")
        : "";

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; vertical-align: top;">
            <div style="font-weight: 600; font-size: 14px; color: #111827;">${it.nome}</div>
            ${it.codigo ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Cód: ${it.codigo}</div>` : ""}
            <div style="font-size: 12px; color: #374151; margin-top: 4px;">Grade: ${grades}</div>
            ${coresTexto ? `<div style="font-size: 12px; color: #92400e; background-color: #fef3c7; padding: 4px 6px; border-radius: 4px; margin-top: 4px; display: inline-block;">🎨 Cores: ${coresTexto}</div>` : ""}
            ${it.observacao ? `<div style="font-size: 11px; color: #4b5563; font-style: italic; margin-top: 2px;">Obs: ${it.observacao}</div>` : ""}
          </td>
          <td style="padding: 12px 8px; text-align: center; vertical-align: top; font-size: 13px; font-weight: 600; color: #111827;">${it.pecas} un</td>
          <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-size: 13px; color: #374151;">${brl(it.preco)}</td>
          <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-size: 13px; font-weight: 600; color: #111827;">${brl(it.valor)}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Pedido #${numFormatado} - Líder Atacado</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    
    <!-- Cabeçalho -->
    <div style="background-color: #0b1329; color: #ffffff; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">👑 LÍDER ATACADO</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">Notificação Oficial de Novo Pedido</p>
    </div>

    <!-- Banner Pedido & Ação Rápida WhatsApp -->
    <div style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 18px 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a;">PEDIDO #${numFormatado}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Realizado em ${data} às ${hora}</div>
        </div>
        <div>
          <span style="display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; background-color: ${isOnline ? "#dbeafe" : "#dcfce7"}; color: ${isOnline ? "#1e40af" : "#166534"};">
            ${isOnline ? "💳 Pagamento Online (InfinitePay)" : "💬 Fechamento via WhatsApp"}
          </span>
        </div>
      </div>

      <!-- Botão de Ação Rápida -->
      <div style="margin-top: 14px; text-align: center;">
        <a href="${waClienteLink}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.3);">
          📲 Chamar Cliente no WhatsApp (${formatWhatsappIntl(p.cliente.whatsapp)})
        </a>
      </div>
    </div>

    <div style="padding: 24px;">

      <!-- Dados do Cliente & Entrega -->
      <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px;">
        <!-- Card Cliente -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #4b5563; letter-spacing: 0.5px;">👤 Dados do Cliente</h3>
          <div style="font-size: 14px; line-height: 1.6; color: #111827;">
            <div><strong>Nome:</strong> ${p.cliente.nome}</div>
            <div><strong>WhatsApp:</strong> <a href="${waClienteLink}" style="color: #16a34a; font-weight: 600; text-decoration: none;">${formatWhatsappIntl(p.cliente.whatsapp)}</a></div>
            <div><strong>E-mail:</strong> ${p.cliente.email}</div>
            ${p.cliente.cpf ? `<div><strong>CPF:</strong> ${maskCpf(p.cliente.cpf)}</div>` : ""}
          </div>
        </div>

        <!-- Card Entrega -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; color: #4b5563; letter-spacing: 0.5px;">
            📍 Endereço de Entrega ${isDrop ? '<span style="background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 6px;">DROPSHIPPING</span>' : ""}
          </h3>
          <div style="font-size: 14px; line-height: 1.6; color: #111827;">
            ${isDrop && p.entrega.destinatario ? `<div><strong>Destinatário:</strong> ${p.entrega.destinatario}</div>` : ""}
            ${isDrop && p.entrega.whatsappDestinatario ? `<div><strong>Tel Destinatário:</strong> ${formatWhatsappIntl(p.entrega.whatsappDestinatario)}</div>` : ""}
            <div>${p.entrega.rua}, nº ${p.entrega.numero} ${p.entrega.complemento ? `(${p.entrega.complemento})` : ""}</div>
            <div>Bairro: ${p.entrega.bairro} — ${p.entrega.cidade}/${p.entrega.estado}</div>
            <div><strong>CEP:</strong> ${maskCep(p.entrega.cep)}</div>
          </div>
        </div>
      </div>

      <!-- Tabela de Itens -->
      <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #111827;">📦 Itens do Pedido (${p.totalPecas} peças)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background-color: #f3f4f6; text-align: left; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 10px 8px; font-weight: 600; color: #374151;">Produto / Grade / Cores</th>
            <th style="padding: 10px 8px; text-align: center; font-weight: 600; color: #374151;">Qtd</th>
            <th style="padding: 10px 8px; text-align: right; font-weight: 600; color: #374151;">Unitário</th>
            <th style="padding: 10px 8px; text-align: right; font-weight: 600; color: #374151;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itensHtml}
        </tbody>
      </table>

      <!-- Resumo Financeiro & Frete -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #475569;">Total de Peças:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">${p.totalPecas} peças (Faixa ${p.faixa}+ peças)</td>
          </tr>
          ${
            p.frete
              ? `
          <tr>
            <td style="padding: 4px 0; color: #475569;">Frete Escolhido:</td>
            <td style="padding: 4px 0; text-align: right; font-weight: 600;">
              ${p.frete.servico} (${p.frete.prazo}) &bull; ${brl(p.frete.preco)}
            </td>
          </tr>`
              : `
          <tr>
            <td style="padding: 4px 0; color: #475569;">Frete:</td>
            <td style="padding: 4px 0; text-align: right; color: #64748b;">A combinar / não selecionado</td>
          </tr>`
          }
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="padding: 8px 0 0 0; font-size: 16px; font-weight: 800; color: #0f172a;">VALOR TOTAL:</td>
            <td style="padding: 8px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #15803d;">${brl(p.total)}</td>
          </tr>
        </table>
      </div>

      ${
        p.observacao
          ? `
      <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #78350f;">
        <strong>📝 Observações do Cliente:</strong> ${p.observacao}
      </div>`
          : ""
      }

      <div style="font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Este e-mail foi gerado automaticamente pelo sistema da loja <strong>Líder Atacado</strong> ao receber um novo pedido.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function gerarTextoEmailPedido(p: DadosEmailPedido): string {
  const { data, hora } = formatDateTime(p.criadoEm);
  const numFormatado = padNumero(p.numero);
  const waClean = whatsappLinkNumber(p.cliente.whatsapp);
  const isDrop = !!p.entrega.isDropshipping;

  const linhasItens = p.itens
    .map((it) => {
      const grades = TAMANHOS.filter((t) => (it.qtd[t.key] || 0) > 0)
        .map((t) => `${t.label}: ${it.qtd[t.key]}`)
        .join(" | ");
      const cores = it.cores?.length
        ? `\n   Cores: ${it.cores.map((c) => formatarCorTamanhos(c.cor, c.qtd)).filter(Boolean).join(" | ")}`
        : "";
      return `- ${it.nome} (${it.pecas} un) - ${brl(it.valor)}\n   Grade: ${grades}${cores}`;
    })
    .join("\n\n");

  return `
👑 NOVO PEDIDO RECEBIDO - LÍDER ATACADO

Pedido: #${numFormatado}
Data/Hora: ${data} às ${hora}
Forma de Pagamento: ${p.formaPagamento === "infinitepay" ? "Cartão/Pix Online (InfinitePay)" : "Fechamento via WhatsApp"}

--- CLIENTE ---
Nome: ${p.cliente.nome}
WhatsApp: ${formatWhatsappIntl(p.cliente.whatsapp)} (https://wa.me/${waClean})
E-mail: ${p.cliente.email}
${p.cliente.cpf ? `CPF: ${maskCpf(p.cliente.cpf)}\n` : ""}
--- ENTREGA ${isDrop ? "[DROPSHIPPING]" : ""} ---
${isDrop && p.entrega.destinatario ? `Destinatário: ${p.entrega.destinatario}\n` : ""}${isDrop && p.entrega.whatsappDestinatario ? `Tel Destinatário: ${formatWhatsappIntl(p.entrega.whatsappDestinatario)}\n` : ""}Endereço: ${p.entrega.rua}, nº ${p.entrega.numero} ${p.entrega.complemento ? `(${p.entrega.complemento})` : ""}
Bairro: ${p.entrega.bairro} - ${p.entrega.cidade}/${p.entrega.estado}
CEP: ${maskCep(p.entrega.cep)}

--- ITENS DO PEDIDO (${p.totalPecas} PEÇAS) ---
${linhasItens}

--- RESUMO ---
Total de Peças: ${p.totalPecas} (Faixa ${p.faixa}+ peças)
${p.frete ? `Frete: ${p.frete.servico} (${p.frete.prazo}) - ${brl(p.frete.preco)}` : "Frete: A combinar"}
VALOR TOTAL: ${brl(p.total)}
${p.observacao ? `\nObservação: ${p.observacao}` : ""}
  `.trim();
}

/**
 * Envia notificação por e-mail via Resend API quando um novo pedido é gerado.
 * Se RESEND_API_KEY não estiver configurada, apenas registra log sem quebrar a execução.
 */
export async function enviarEmailNovoPedido(dados: DadosEmailPedido): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const apiKey = (process.env["RESEND_API_KEY"] ?? "").trim();
  if (!apiKey) {
    console.warn("[Notificação de Pedido] RESEND_API_KEY não configurada. E-mail não enviado.");
    return { success: false, error: "RESEND_API_KEY_NOT_CONFIGURED" };
  }

  const destinatario = (
    dados.emailLoja?.trim() ||
    process.env["NOTIFICATION_EMAIL"]?.trim() ||
    process.env["RESEND_TO_EMAIL"]?.trim() ||
    "lideratacado8@gmail.com"
  );

  const remetente = (
    process.env["RESEND_FROM_EMAIL"]?.trim() ||
    "Líder Atacado <onboarding@resend.dev>"
  );

  const numFormatado = padNumero(dados.numero);
  const assunto = `🛍️ Novo Pedido #${numFormatado} - Líder Atacado (${dados.totalPecas} peças - R$ ${brl(dados.total)})`;
  const html = gerarHtmlEmailPedido(dados);
  const text = gerarTextoEmailPedido(dados);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: [destinatario],
        subject: assunto,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Notificação de Pedido] Falha no Resend HTTP ${res.status}:`, errText);
      return { success: false, error: `Resend HTTP ${res.status}: ${errText}` };
    }

    const json = (await res.json()) as { id?: string };
    console.log(`[Notificação de Pedido] E-mail enviado com sucesso para ${destinatario}. ID: ${json.id}`);
    return { success: true, id: json.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Notificação de Pedido] Erro de rede/requisição ao enviar e-mail:", msg);
    return { success: false, error: msg };
  }
}
