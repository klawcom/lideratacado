import { TAMANHOS, type Qtd } from "./pricing";
import { formatDateTime, formatWhatsappIntl, maskCep, money, padNumero } from "./format";
import { formatarCorTamanhos } from "./colors";

export type MensagemItem = {
  nome: string;
  pecas: number;
  preco: number;
  valor: number;
  qtd: Qtd;
  cores?: { cor: string; qtd: Qtd }[];
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
  };
  cliente: { nome: string; email: string; whatsapp: string };
  entrega: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  observacao?: string;
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
  L.push(`⚠️ *Cores:* Conforme disponibilidade do estoque. Caso alguma cor escolhida não esteja disponível, enviaremos cores sortidas.`);
  L.push(SEP);
  L.push(`*CLIENTE*`);
  L.push(`👤 ${p.cliente.nome}`);
  L.push(`📧 ${p.cliente.email}`);
  L.push(`📱 ${formatWhatsappIntl(p.cliente.whatsapp)}`);
  L.push(`*ENTREGA*`);
  const comp = p.entrega.complemento?.trim();
  L.push(`📍 ${p.entrega.rua}, ${p.entrega.numero}${comp ? ` ${comp}` : ""}`);
  L.push(p.entrega.bairro);
  L.push(`${p.entrega.cidade}/${p.entrega.estado.toUpperCase()}`);
  L.push(`CEP ${maskCep(p.entrega.cep)}`);
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
