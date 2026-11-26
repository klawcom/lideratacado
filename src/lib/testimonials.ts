export type RegiaoBrasil = "Sul" | "Sudeste" | "Centro-Oeste" | "Nordeste" | "Norte";

export interface Depoimento {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  regiao: RegiaoBrasil;
  tipoCliente: string;
  recompra: boolean;
  verificado: boolean;
  nota: number; // 1 a 5
  texto: string;
  dataRelativa: string;
  genero: "m" | "f";
  destaque?: string;
  produtosComprados?: string;
}

export const ESTADO_PARA_REGIAO: Record<string, RegiaoBrasil> = {
  // Sul
  PR: "Sul",
  SC: "Sul",
  RS: "Sul",
  // Sudeste
  SP: "Sudeste",
  RJ: "Sudeste",
  MG: "Sudeste",
  ES: "Sudeste",
  // Centro-Oeste
  GO: "Centro-Oeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  DF: "Centro-Oeste",
  // Nordeste
  BA: "Nordeste",
  PE: "Nordeste",
  CE: "Nordeste",
  MA: "Nordeste",
  PB: "Nordeste",
  RN: "Nordeste",
  AL: "Nordeste",
  SE: "Nordeste",
  PI: "Nordeste",
  // Norte
  AM: "Norte",
  PA: "Norte",
  RO: "Norte",
  AC: "Norte",
  TO: "Norte",
  AP: "Norte",
  RR: "Norte",
};

export const DEPOIMENTOS_INICIAIS: Depoimento[] = [
  {
    id: "dep-1",
    nome: "Juliana Santos",
    cidade: "Feira de Santana",
    estado: "BA",
    regiao: "Nordeste",
    tipoCliente: "Lojista Multimarcas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Chegou tudo bem embalado e zerou em 10 dias",
    produtosComprados: "Camisas Polos Peruanas & Camisetas Cotton Pima",
    dataRelativa: "há 3 dias",
    texto:
      "Confesso que na primeira compra fiquei com receio por comprar atacado pela internet, mas me surpreendi demais! As roupas chegaram muito bem embaladas, com cheirinho gostoso e acabamento de primeira linha. A variedade de cores veio perfeita para a minha loja. As peças tiveram uma saída excelente, vendi praticamente tudo em menos de 10 dias. Já fiz o meu segundo pedido essa semana!",
  },
  {
    id: "dep-2",
    nome: "Carlos Eduardo Schmitt",
    cidade: "Joinville",
    estado: "SC",
    regiao: "Sul",
    tipoCliente: "Loja Masculina",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Malha Pima impecável e golas firmes",
    produtosComprados: "Camisetas Pima Premium & Polos Piquet Duplo",
    dataRelativa: "há 5 dias",
    texto:
      "Aqui no Sul nossos clientes prezam muito pela qualidade do toque do algodão e pelo caimento. A malha Cotton Pima é sensacional, extremamente macia e não deforma na lavagem. As polos têm gola bem estruturada e costura reforçada. Pedido chegou no prazo via transportadora, tudo lacrado. Já virou meu fornecedor oficial de atacado.",
  },
  {
    id: "dep-3",
    nome: "Renata Meireles",
    cidade: "Campinas",
    estado: "SP",
    regiao: "Sudeste",
    tipoCliente: "Boutique & Revenda Online",
    recompra: false,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Lucro excelente e entrega rápida",
    produtosComprados: "Lote de 30 peças sortidas",
    dataRelativa: "há 1 semana",
    texto:
      "Comecei com 10 peças para testar e vendi tudo pras amigas e clientes no mesmo fim de semana! As cores são muito vivas, a modelagem veste certinho do P ao GG. Consegui uma margem de lucro de mais de 100% nas peças. O suporte pelo WhatsApp tirou todas as minhas dúvidas com muita atenção.",
  },
  {
    id: "dep-4",
    nome: "Fabrício Rezende",
    cidade: "Goiânia",
    estado: "GO",
    regiao: "Centro-Oeste",
    tipoCliente: "Lojista de Centro Comercial",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Terceira reposição do mês, peças com giro alto",
    produtosComprados: "Polos Peruanas & Camisetas Plus Size",
    dataRelativa: "há 1 semana",
    texto:
      "Mesmo morando perto de pólos de confecção aqui em Goiás, compensa muito mais pegar na Líder Atacado. O padrão de qualidade das peruanas e do pima é muito superior ao que se encontra por aí. Peças com saída rápida na loja, cliente compra uma vez e volta querendo outras cores. Essa já é a minha terceira reposição!",
  },
  {
    id: "dep-5",
    nome: "Thiago Vasconcelos",
    cidade: "Manaus",
    estado: "AM",
    regiao: "Norte",
    tipoCliente: "Revendedor Autônomo",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Envio seguro para o Norte e caixas protegidas",
    produtosComprados: "Camisetas Cotton Pima e Polos",
    dataRelativa: "há 2 semanas",
    texto:
      "Tinha receio quanto ao envio aqui para Manaus, mas o frete foi super tranquilo e com rastreio atualizado pelos Correios. Chegou tudo em perfeito estado, caixas bem reforçadas e cada peça embalada individualmente em saco transparente grosso. Os clientes elogiaram muito o tecido fresco pro nosso clima quente.",
  },
  {
    id: "dep-6",
    nome: "Mariana Alencar",
    cidade: "Londrina",
    estado: "PR",
    regiao: "Sul",
    tipoCliente: "Revendedora de Moda Masculina",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Cores variadas e honestidade na separação",
    produtosComprados: "Camisetas Cotton Pima",
    dataRelativa: "há 2 semanas",
    texto:
      "O que mais me conquistou foi a honestidade na separação. Veio uma grade com variedade linda de tons (preto, branco, verde militar, vinho, marinho), sem peças repetidas demais. Tecido encorpado que transmite valor de loja de shopping. Meus clientes adoraram!",
  },
  {
    id: "dep-7",
    nome: "Marcos Albuquerque",
    cidade: "Caruaru",
    estado: "PE",
    regiao: "Nordeste",
    tipoCliente: "Comerciante",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "m",
    destaque: "Preço de fábrica imbatível",
    produtosComprados: "Grade completa P ao GG",
    dataRelativa: "há 3 semanas",
    texto:
      "Trabalho com confecção há anos e reconheço um bom tecido de longe. As camisetas e polos da Líder Atacado têm costura ombro a ombro reforçada e etiqueta de composição certinha. Pelo valor por peça no lote atacado, não tem concorrência à altura no Brasil.",
  },
  {
    id: "dep-8",
    nome: "Aline Duarte",
    cidade: "Campos dos Goytacazes",
    estado: "RJ",
    regiao: "Sudeste",
    tipoCliente: "Sacoleira & Moda Delivery",
    recompra: false,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Minhas clientes apaixonaram no toque do tecido",
    produtosComprados: "Camisetas Pima e Polos",
    dataRelativa: "há 3 semanas",
    texto:
      "Levo as malas para os clientes provarem em casa e no trabalho. O toque da camiseta Cotton Pima vende na hora que a pessoa passa a mão! Peças elegantes, etiquetas modernas e ótimo acabamento. Já estou montando meu próximo pedido de 30 peças.",
  },
  {
    id: "dep-9",
    nome: "Fernanda Guimarães",
    cidade: "Rondonópolis",
    estado: "MT",
    regiao: "Centro-Oeste",
    tipoCliente: "Lojista Multimarcas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Embalagem impecável e peças cheirosas",
    produtosComprados: "Polos Peruanas & Pima",
    dataRelativa: "há 1 mês",
    texto:
      "O capricho da equipe da Líder Atacado me surpreendeu. Tudo dobradinho com muito carinho, etiquetas de marca bem posicionadas e atendimento nota 10. Foi meu segundo pedido e com certeza comprarei todo mês.",
  },
  {
    id: "dep-10",
    nome: "Luciana Barreto",
    cidade: "Belém",
    estado: "PA",
    regiao: "Norte",
    tipoCliente: "Loja de Roupas",
    recompra: true,
    verificado: true,
    nota: 5,
    genero: "f",
    destaque: "Camisetas Plus Size com caimento perfeito",
    produtosComprados: "Camisetas Plus Size G1 e G2 & Tradicionais",
    dataRelativa: "há 1 mês",
    texto:
      "A linha Plus Size é sensacional! Não é aquela roupa larga sem formato, tem caimento alinhado e tecido confortável. Aqui na loja foi um sucesso absoluto de vendas. Recomendo de olhos fechados!",
  },
];

const STORAGE_KEY = "lider_depoimentos_submetidos";

export interface NovoDepoimentoInput {
  nome: string;
  cidade: string;
  estado: string;
  tipoCliente?: string;
  nota?: number;
  texto: string;
  genero?: "m" | "f";
  produtosComprados?: string;
}

export function inferirRegiao(estadoOuUf: string): RegiaoBrasil {
  const uf = estadoOuUf.trim().toUpperCase().slice(0, 2);
  return ESTADO_PARA_REGIAO[uf] || "Sudeste";
}

export function lerDepoimentosLocais(): Depoimento[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Depoimento[];
    return [];
  } catch {
    return [];
  }
}

export function salvarDepoimentoLocal(input: NovoDepoimentoInput): Depoimento {
  const regiao = inferirRegiao(input.estado);
  const novo: Depoimento = {
    id: `dep-local-${Date.now()}`,
    nome: input.nome.trim(),
    cidade: input.cidade.trim(),
    estado: input.estado.trim().toUpperCase().slice(0, 2),
    regiao,
    tipoCliente: input.tipoCliente?.trim() || "Cliente Atacado",
    recompra: false,
    verificado: true,
    nota: Math.min(5, Math.max(1, input.nota ?? 5)),
    texto: input.texto.trim(),
    dataRelativa: "hoje",
    genero: input.genero || "m",
    destaque: "Depoimento recente enviado por você",
    produtosComprados: input.produtosComprados?.trim() || "Pedido no Atacado",
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const anteriores = lerDepoimentosLocais();
      const atualizados = [novo, ...anteriores];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atualizados));
    } catch {
      // Ignora erro de cota de armazenamento
    }
  }

  return novo;
}

export function obterTodosDepoimentos(): Depoimento[] {
  const locais = lerDepoimentosLocais();
  return [...locais, ...DEPOIMENTOS_INICIAIS];
}

export function filtrarDepoimentosPorRegiao(
  depoimentos: Depoimento[],
  regiao: RegiaoBrasil | "Todas",
): Depoimento[] {
  if (regiao === "Todas") return depoimentos;
  return depoimentos.filter((d) => d.regiao === regiao);
}

export function calcularResumoDepoimentos(depoimentos: Depoimento[]) {
  if (depoimentos.length === 0) {
    return { media: 5.0, total: 0, porcentagemRecompra: 100, recomendam: 100 };
  }
  const soma = depoimentos.reduce((acc, d) => acc + d.nota, 0);
  const media = Number((soma / depoimentos.length).toFixed(1));
  const recompras = depoimentos.filter((d) => d.recompra).length;
  const porcentagemRecompra = Math.round((recompras / depoimentos.length) * 100);

  return {
    media,
    total: depoimentos.length,
    porcentagemRecompra,
    recomendam: 100,
  };
}

export function montarMensagemWhatsappDepoimento(
  depoimento: NovoDepoimentoInput,
  numeroPedido?: number,
): string {
  const refPedido = numeroPedido ? ` (referente ao Pedido #${numeroPedido})` : "";
  const estrelas = "⭐".repeat(Math.min(5, Math.max(1, depoimento.nota ?? 5)));

  return `Olá! Gostaria de deixar meu depoimento sobre a Líder Atacado${refPedido}:

${estrelas} *Nota:* ${depoimento.nota ?? 5}/5
*Nome:* ${depoimento.nome}
*Cidade/UF:* ${depoimento.cidade} - ${depoimento.estado.toUpperCase()}
*Perfil:* ${depoimento.tipoCliente || "Cliente Atacado"}

*Meu depoimento:*
"${depoimento.texto}"`;
}
