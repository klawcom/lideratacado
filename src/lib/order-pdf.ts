import { brl, formatDateTime, formatWhatsappIntl, maskCep, maskCpf, padNumero } from "./format";

export type PedidoPDFData = {
  numero: number;
  criadoEm: string | Date;
  statusLabel?: string;
  cliente: {
    nome: string;
    email: string;
    whatsapp: string;
    cpf?: string;
  };
  entrega: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    isDropshipping?: boolean;
    destinatario?: string;
    cpfDestinatario?: string;
    whatsappDestinatario?: string;
  };
  itens: {
    nome: string;
    codigo?: string;
    pecas: number;
    preco: number;
    valor: number;
    detalhes?: string;
    observacao?: string;
  }[];
  resumo: {
    totalPecas: number;
    faixa: number;
    total: number;
  };
  frete?: {
    servico: string;
    preco: number;
    prazo: string;
  };
  observacao?: string;
  notasInternas?: string;
};

export function gerarHtmlPedidoPdf(p: PedidoPDFData): string {
  const { data, hora } = formatDateTime(p.criadoEm);
  const totalProdutos = p.frete ? p.resumo.total - p.frete.preco : p.resumo.total;
  const isDrop = Boolean(p.entrega.isDropshipping || (p.observacao && p.observacao.includes("[DROPSHIPPING]")));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedido #${padNumero(p.numero)} - Líder Atacado</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #b45309;
      font-weight: 700;
      margin-top: 2px;
    }
    .order-badge {
      text-align: right;
    }
    .order-num {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .order-date {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .status-pill {
      display: inline-block;
      margin-top: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      background: #fafafa;
    }
    .box-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .drop-tag {
      background: #dbeafe;
      color: #1e40af;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
    }
    .box p {
      margin: 2px 0;
      font-size: 12px;
    }
    .box strong {
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      padding: 8px 10px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
    th.text-right, td.text-right {
      text-align: right;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      font-size: 12px;
    }
    tr:nth-child(even) td {
      background: #fcfcfc;
    }
    .item-name {
      font-weight: 700;
      color: #0f172a;
    }
    .item-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .item-obs {
      font-size: 11px;
      color: #0369a1;
      background: #f0f9ff;
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      margin-top: 3px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
      margin-bottom: 16px;
      align-items: start;
    }
    .notes-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
      color: #475569;
      background: #ffffff;
    }
    .notes-box h4 {
      margin: 0 0 4px 0;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .totals-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .totals-table tr.total-row td {
      border-top: 2px solid #0f172a;
      background: #0f172a;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      padding: 8px 12px;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #64748b;
    }
    .actions-bar {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #15803d;
      color: #ffffff;
      border: 0;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .actions-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <span>Visualização do Pedido para Impressão ou Download em PDF</span>
    <button class="btn-print" onclick="window.print()">🖨️ Salvar em PDF / Imprimir</button>
  </div>

  <div class="header">
    <div class="brand">
      <h1 class="brand-title">👑 LÍDER ATACADO</h1>
      <span class="brand-sub">Camisetas Básicas e Polos no Atacado</span>
      <span style="font-size: 11px; color: #64748b; margin-top: 2px;">WhatsApp: +55 (47) 99136-4084 · lideratacado8@gmail.com</span>
    </div>
    <div class="order-badge">
      <p class="order-num">PEDIDO #${padNumero(p.numero)}</p>
      <p class="order-date">${data} às ${hora}</p>
      ${p.statusLabel ? `<span class="status-pill">${p.statusLabel}</span>` : ""}
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <div class="box-title">
        <span>Cliente / Revendedor</span>
      </div>
      <p><strong>Nome:</strong> ${p.cliente.nome}</p>
      ${p.cliente.cpf ? `<p><strong>CPF:</strong> ${maskCpf(p.cliente.cpf)}</p>` : ""}
      <p><strong>WhatsApp:</strong> ${formatWhatsappIntl(p.cliente.whatsapp)}</p>
      <p><strong>E-mail:</strong> ${p.cliente.email}</p>
    </div>

    <div class="box">
      <div class="box-title">
        <span>Entrega</span>
        ${isDrop ? `<span class="drop-tag">📦 DROPSHIPPING</span>` : ""}
      </div>
      ${isDrop && p.entrega.destinatario ? `<p><strong>Destinatário:</strong> ${p.entrega.destinatario}</p>` : ""}
      ${isDrop && p.entrega.cpfDestinatario ? `<p><strong>CPF Destinatário:</strong> ${maskCpf(p.entrega.cpfDestinatario)}</p>` : ""}
      ${isDrop && p.entrega.whatsappDestinatario ? `<p><strong>WhatsApp Dest.:</strong> ${formatWhatsappIntl(p.entrega.whatsappDestinatario)}</p>` : ""}
      <p><strong>Endereço:</strong> ${p.entrega.rua}, ${p.entrega.numero}${p.entrega.complemento ? ` (${p.entrega.complemento})` : ""}</p>
      <p><strong>Bairro:</strong> ${p.entrega.bairro}</p>
      <p><strong>Cidade/UF:</strong> ${p.entrega.cidade}/${p.entrega.estado.toUpperCase()}</p>
      <p><strong>CEP:</strong> ${maskCep(p.entrega.cep)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Produto / Modelo</th>
        <th>Grade / Detalhes</th>
        <th class="text-right" style="width: 50px;">Peças</th>
        <th class="text-right" style="width: 90px;">Valor Unit.</th>
        <th class="text-right" style="width: 90px;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${p.itens
        .map(
          (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <div class="item-name">${it.nome}</div>
            ${it.codigo ? `<div class="item-sub">Código: ${it.codigo}</div>` : ""}
            ${it.observacao ? `<div class="item-obs">Obs: ${it.observacao}</div>` : ""}
          </td>
          <td>
            <div class="item-sub">${it.detalhes || "Padrão"}</div>
          </td>
          <td class="text-right" style="font-weight: 600;">${it.pecas}</td>
          <td class="text-right">${brl(it.preco)}</td>
          <td class="text-right" style="font-weight: 700;">${brl(it.valor)}</td>
        </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <div class="summary-grid">
    <div class="notes-box">
      <h4>Avisos e Observações</h4>
      <p style="margin: 0 0 4px 0;">⚠️ <strong>Cores:</strong> Conforme disponibilidade do estoque. Caso alguma cor escolhida não esteja disponível, enviaremos cores sortidas de mesma qualidade.</p>
      ${p.observacao ? `<p style="margin: 4px 0 0 0;">📝 <strong>Obs. do pedido:</strong> ${p.observacao}</p>` : ""}
      ${p.notasInternas ? `<p style="margin: 4px 0 0 0; color: #b45309;">🔒 <strong>Notas internas:</strong> ${p.notasInternas}</p>` : ""}
    </div>

    <table class="totals-table">
      <tbody>
        <tr>
          <td>Total de peças:</td>
          <td class="text-right" style="font-weight: 700;">${p.resumo.totalPecas} peças</td>
        </tr>
        <tr>
          <td>Faixa de atacado:</td>
          <td class="text-right">a partir de ${p.resumo.faixa} peças</td>
        </tr>
        <tr>
          <td>Subtotal dos produtos:</td>
          <td class="text-right" style="font-weight: 600;">${brl(totalProdutos > 0 ? totalProdutos : p.resumo.total)}</td>
        </tr>
        <tr>
          <td>Frete ${p.frete ? `(${p.frete.servico})` : ""}:</td>
          <td class="text-right" style="font-weight: 600;">${p.frete ? brl(p.frete.preco) : "A combinar"}</td>
        </tr>
        ${p.frete?.prazo ? `<tr><td style="font-size: 11px; color: #64748b;">Prazo estimado:</td><td class="text-right" style="font-size: 11px; color: #64748b;">${p.frete.prazo}</td></tr>` : ""}
        <tr class="total-row">
          <td>TOTAL DO PEDIDO:</td>
          <td class="text-right">${brl(p.resumo.total)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <span>Líder Atacado — Este documento é um espelho do pedido realizado na loja.</span>
    <span>Emissão: ${data} ${hora}</span>
  </div>
</body>
</html>`;
}

export function gerarPedidoPdf(p: PedidoPDFData): void {
  const html = gerarHtmlPedidoPdf(p);
  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch (e) {
        console.error("Erro ao imprimir PDF:", e);
      }
    }, 300);
  } else {
    // Fallback: iframe for environments that block popup windows
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2500);
      }, 400);
    }
  }
}
