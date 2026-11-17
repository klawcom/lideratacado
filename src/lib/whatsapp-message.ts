import { TAMANHOS, type Qtd } from "./pricing";
import { formatDateTime, formatWhatsappIntl, maskCep, maskCpf, money, padNumero } from "./format";
import { formatarCorTamanhos } from "./colors";

export type MensagemItem = {
  nome: string;
  pecas: number;
  preco: number;
  valor: number;
  qtd: Qtd;
  cores?: { cor: string; qtd: Qtd }[] | undefined;
  observacao?: string;
};

export type MensagemPedido = {
  numero: number;
  criadoEm: string | Date;
  itens: MensagemItem[];
  totalPecas: number;
  faixa: number;
  total: number;
  frete?: {
    servico: string;
    preco: number;
    prazo: string;
  } | undefined;
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
  substituicaoCores?: "contato" | "sortidas" | undefined;
  observacao?: string | undefined;
};

const SEP = "━━━━━━━━━━━━━━";

export function tamanhosLinha(q: Qtd): string {
  return TAMANHOS.filter((t) => (q[t.key] || 0) > 0)
    .map((t) => `${t.label} ${q[t.key]}`)
    .join(" | ");
}

export function montarMensagemPedido(p: MensagemPedido): string {
  const { data, hora } = formatDateTime(p.criadoEm);
  const L: string[] = [];
  L.push(`🛍️ *NOVO PEDIDO #${padNumero(p.numero)}*`);
  L.push(`*Cliente: ${p.cliente.nome} - ${p.totalPecas} Peças*`);
  L.push(`*Líder Atacado*`);
  L.push(`📅 ${data} às ${hora}`);
  L.push(SEP);
  L.push(`*ITENS*`);
  p.itens.forEach((it, i) => {
    L.push(`*${i + 1}) ${it.nome}*`);
    L.push(`${it.pecas} peças (R$ ${money(it.preco)} por peça)`);

    if (it.cores && it.cores.length > 0) {
      it.cores.forEach((c) => {
        const linhaCor = formatarCorTamanhos(c.cor, c.qtd);
        if (linhaCor) L.push(linhaCor);
      });
    } else {
      const t = tamanhosLinha(it.qtd);
      if (t) L.push(`Tamanhos: ${t}`);
    }

    L.push(`Valor: R$ ${money(it.valor)}`);
    if (it.observacao?.trim()) L.push(`📝 Obs.: ${it.observacao.trim()}`);
    if (i < p.itens.length - 1) L.push("");
  });
  L.push(SEP);
  L.push(`*RESUMO*`);
  L.push(`Total de peças: ${p.totalPecas}`);
  L.push(`Faixa aplicada: a partir de ${p.faixa} peças`);
  if (p.frete) {
    const totalProdutos = p.total - p.frete.preco;
    L.push(`Total dos produtos: R$ ${money(totalProdutos > 0 ? totalProdutos : p.total)}`);
    L.push(`📦 Frete (${p.frete.servico}): R$ ${money(p.frete.preco)} (${p.frete.prazo})`);
    L.push(`*Total do pedido: R$ ${money(p.total)}*`);
  } else {
    L.push(`*Total dos produtos: R$ ${money(p.total)}*`);
    L.push(`Frete e pagamento: a combinar`);
  }
  L.push(`⚠️ *Cores:* Conforme disponibilidade do estoque. Caso falte alguma cor na separação, envio em cores sortidas (regra de atacado).`);
  L.push(SEP);
  if (p.entrega.isDropshipping) {
    L.push(`📦 *MODALIDADE: DROPSHIPPING*`);
    L.push(`*CLIENTE (REVENDEDOR)*`);
    L.push(`👤 ${p.cliente.nome}`);
    if (p.cliente.cpf) {
      L.push(`📄 CPF: ${maskCpf(p.cliente.cpf)}`);
    }
    L.push(`📧 ${p.cliente.email}`);
    L.push(`📱 ${formatWhatsappIntl(p.cliente.whatsapp)}`);
    L.push(`*ENTREGA (DESTINATÁRIO FINAL)*`);
    if (p.entrega.destinatario) {
      L.push(`👤 Destinatário: ${p.entrega.destinatario}`);
    }
    if (p.entrega.cpfDestinatario) {
      L.push(`📄 CPF Destinatário: ${maskCpf(p.entrega.cpfDestinatario)}`);
    }
    if (p.entrega.whatsappDestinatario) {
      L.push(`📱 WhatsApp Destinatário: ${formatWhatsappIntl(p.entrega.whatsappDestinatario)}`);
    }
    const comp = p.entrega.complemento?.trim();
    L.push(`📍 ${p.entrega.rua}, ${p.entrega.numero}${comp ? ` ${comp}` : ""}`);
    L.push(p.entrega.bairro);
    L.push(`${p.entrega.cidade}/${p.entrega.estado.toUpperCase()}`);
    L.push(`CEP ${maskCep(p.entrega.cep)}`);
  } else {
    L.push(`*CLIENTE*`);
    L.push(`👤 ${p.cliente.nome}`);
    if (p.cliente.cpf) {
      L.push(`📄 CPF: ${maskCpf(p.cliente.cpf)}`);
    }
    L.push(`📧 ${p.cliente.email}`);
    L.push(`📱 ${formatWhatsappIntl(p.cliente.whatsapp)}`);
    L.push(`*ENTREGA*`);
    const comp = p.entrega.complemento?.trim();
    L.push(`📍 ${p.entrega.rua}, ${p.entrega.numero}${comp ? ` ${comp}` : ""}`);
    L.push(p.entrega.bairro);
    L.push(`${p.entrega.cidade}/${p.entrega.estado.toUpperCase()}`);
    L.push(`CEP ${maskCep(p.entrega.cep)}`);
  }
  if (p.observacao?.trim()) {
    L.push(`📝 *Observação do pedido:*`);
    L.push(p.observacao.trim());
  }
  L.push("");
  if (p.frete) {
    L.push("Aguardo a confirmação e as formas de pagamento. Obrigado!");
  } else {
    L.push("Aguardo o valor do frete e as formas de pagamento. Obrigado!");
  }
  return L.join("\n");
}

export function linkWhatsapp(numeroLoja: string, mensagem: string): string {
  return `https://wa.me/${numeroLoja.replace(/\D+/g, "")}?text=${encodeURIComponent(mensagem)}`;
}
