import {
  TEXTO_MEDIDAS_COTTON_PIMA,
  TEXTO_MEDIDAS_POLO,
  TEXTO_MEDIDAS_PLUS_SIZE,
} from "./pima-defaults";

export type TipoTecidoIA = "cotton_pima" | "piquet_duplo" | "plus_size" | "basica_premium";
export type TomVozIA = "ceo_autoridade" | "luxo_boutique" | "comercial_giro";

export interface GerarDescricaoOpcoes {
  nomeProduto: string;
  codigoModelo?: string;
  tipoTecido?: TipoTecidoIA;
  tomVoz?: TomVozIA;
  destacarMargemLucro?: boolean;
  destacarToqueSensorial?: boolean;
  destacarPreEncolhimento?: boolean;
  incluirMedidas?: boolean;
}

export function detectarTipoTecido(nome: string, codigo?: string): TipoTecidoIA {
  const texto = `${nome} ${codigo || ""}`.toLowerCase();
  if (/plus\s*size|tamanho\s*especial|g1|g2/i.test(texto)) return "plus_size";
  if (/polo|piquet/i.test(texto)) return "piquet_duplo";
  if (/pima|cotton\s*pima|peruano/i.test(texto)) return "cotton_pima";
  return "cotton_pima"; // Padrão da loja
}

/**
 * Textos Mestres Oficiais com Autoridade de CEO para cada linha de produto.
 */
export const DESCRICAO_CEO_COTTON_PIMA = `A camiseta que o cliente pega, sente o tecido e já quer levar. Peça estratégica desenhada para posicionar sua loja no mais alto padrão de qualidade do mercado masculino. Desenvolvida em autêntico Algodão Cotton Pima Peruano de fibras nobres e extralongas, esta camiseta entrega uma experiência sensorial imediata: o cliente toca no tecido e a venda acontece no mesmo instante.

Diferenciais da Malha & Acabamento:
• Malha peruana Cotton Pima: Fio nobre colhido manualmente, macia e resistente com toque de seda aveludado e frescor térmico incomparável.
• Com elastano: veste bem e não perde a forma. Zero torção e estabilidade dimensional após a lavagem.
• Costura reforçada ombro a ombro: Pesponto duplo de alta tenacidade e gola estruturada que não esgarça.
• Tingimento nobre de alta fixação: Cores variadas (sortidas) com brilho duradouro que não desbota.
• Tamanhos P ao GG com caimento moderno alinhado.

Por que ter este modelo na sua loja?
• Venda por impacto sensorial: Qualidade percebida de padrão shopping center internacional.
• Alto giro de estoque: Clientes que experimentam a primeira peça voltam com frequência para recomprar outras cores.
• Margem de lucro superior a 100%: Preço direto de fábrica no atacado garantindo máxima rentabilidade na sua revenda.`;

export const DESCRICAO_CEO_POLO_PIQUET = `A polo definitiva para lojistas e revendedores que exigem sofisticação, estrutura e acabamento de alfaiataria esportiva. Produzida em malha nobre Piquet Duplo com padrão peruano de alta gramatura, une elegância impecável e durabilidade para clientes exigentes.

Diferenciais da Malha & Acabamento:
• Malha Piquet Duplo Peruano: Gramatura encorpada com textura refinada, caimento alinhado e respirabilidade natural.
• Gola e punhos com entretela especial: Permanecem firmes e alinhados, sem enrolar ou deformar após o uso e lavagens.
• Peitilho tradicional com botões personalizados: Acabamento de alto padrão de costura interna e externa.
• Pré-lavada e estabilizada: Zero torção lateral e estabilidade dimensional absoluta.

Por que ter este modelo na sua loja?
• Lucro acima da média: Peça com apelo premium vendida facilmente no varejo por mais que o dobro do custo de atacado.
• Versatilidade comercial: Atende desde o ambiente de trabalho e eventos sociais até o dia a dia refinado.
• Fidelização comprovada: Peça indispensável que gera recompra e consolida a reputação da sua marca no vestuário masculino.`;

export const DESCRICAO_CEO_PLUS_SIZE = `Desenvolvida com autoridade técnica para liderar uma das categorias mais rentáveis e com maior demanda reprimida do mercado. Esta camiseta Plus Size combina o conforto nobre do Algodão Pima com uma modelagem ergonômica inteligente nos tamanhos G1 e G2, valorizando o corpo com total elegância e conforto.

Diferenciais da Malha & Acabamento:
• Malha Cotton Pima com toque sedoso: Tecido nobre, maleável e fresco, que não esquenta e não pinica a pele.
• Modelagem ergonômica proporcional: Ombros alinhados, caimento reto perfeito e comprimento ideal, sem sobras desajeitadas.
• Gola e costuras reforçadas: Suporte estrutural desenvolvido para manter a firmeza no uso prolongado.
• Tingimento uniforme e resistente: Não perde o brilho das cores mesmo sob lavagens frequentes.

Por que ter este modelo na sua loja?
• Categoria com altíssima fidelização: O cliente Plus Size que encontra caimento impecável torna-se cliente fiel e vitalício da sua loja.
• Baixa concorrência e alta margem: Peças de alto padrão em tamanhos especiais possuem margem líquida ainda mais atraente.
• Giro acelerado: Produto indispensável na grade para atender com respeito e excelência a todos os públicos.`;

export const DESCRICAO_CEO_BASICA_PREMIUM = `Uma peça essencial com qualidade superior, desenvolvida para ser o carro-chefe de vendas recorrentes da sua loja. Confeccionada em algodão penteado de fibra longa, oferece toque suave, caimento moderno e acabamento limpo para o uso diário.

Diferenciais da Malha & Acabamento:
• Algodão Penteado Premium: Fios selecionados que eliminam impurezas, oferecendo toque macio e superfície uniforme.
• Gola em ribana canelada com pesponto de reforço: Não deforma e acompanha o contorno do pescoço com perfeição.
• Tingimento reativo de primeira linha: Resistente ao desbotamento e com cores modernas e comerciais.
• Costura de precisão: Durabilidade garantida nas junções de manga e barra.

Por que ter este modelo na sua loja?
• O maior volume de vendas do atacado: Peça básica de alta rotatividade que nunca fica parada na arara.
• Excelente lucratividade: Margem expressiva com preço unitário de entrada muito competitivo.
• Venda casada simples: O cliente compra uma polo ou camisa especial e leva 2 ou 3 camisetas básicas juntas.`;

/**
 * Motor gerador de descrição inteligente com autoridade de CEO.
 */
export function gerarDescricaoIA(opcoes: GerarDescricaoOpcoes): string {
  const tipo = opcoes.tipoTecido || detectarTipoTecido(opcoes.nomeProduto, opcoes.codigoModelo);
  const tom = opcoes.tomVoz || "ceo_autoridade";
  const incluirMedidas = opcoes.incluirMedidas !== false;

  let textoBase = "";
  let textoMedidas = "";

  switch (tipo) {
    case "cotton_pima":
      textoBase = DESCRICAO_CEO_COTTON_PIMA;
      textoMedidas = TEXTO_MEDIDAS_COTTON_PIMA;
      break;
    case "piquet_duplo":
      textoBase = DESCRICAO_CEO_POLO_PIQUET;
      textoMedidas = TEXTO_MEDIDAS_POLO;
      break;
    case "plus_size":
      textoBase = DESCRICAO_CEO_PLUS_SIZE;
      textoMedidas = TEXTO_MEDIDAS_PLUS_SIZE;
      break;
    case "basica_premium":
      textoBase = DESCRICAO_CEO_BASICA_PREMIUM;
      textoMedidas = TEXTO_MEDIDAS_COTTON_PIMA;
      break;
  }

  // Personalização conforme o tom de voz escolhido
  let introducaoPersonalizada = "";
  if (tom === "luxo_boutique") {
    introducaoPersonalizada = `Exclusividade, nobreza têxtil e acabamento refinado para clientes que não abrem mão do mais alto padrão. ${opcoes.nomeProduto} foi criada para elevar a percepção de valor da sua boutique com elegância atemporal.\n\n`;
  } else if (tom === "comercial_giro") {
    introducaoPersonalizada = `Peça campeã de vendas e giro ultra rápido no atacado! ${opcoes.nomeProduto} reúne o melhor preço de fábrica, qualidade indiscutível de tecido e margem de lucro garantida para o seu negócio decolar.\n\n`;
  }

  // Personalização conforme destaques específicos solicitados
  const destaquesAdicionais: string[] = [];
  if (opcoes.destacarMargemLucro) {
    destaquesAdicionais.push("• Margem de Lucro Estratégica: Permite precificação competitiva com retorno líquido superior a 100% no varejo.");
  }
  if (opcoes.destacarToqueSensorial) {
    destaquesAdicionais.push("• Toque Macio e Sedoso: Sensação de frescor imediato na pele que encanta o cliente no primeiro contato.");
  }
  if (opcoes.destacarPreEncolhimento) {
    destaquesAdicionais.push("• Malha Pré-encolhida e Estabilizada: Garantia de satisfação sem encolhimento ou torção pós-lavagem.");
  }

  let resultado = introducaoPersonalizada ? `${introducaoPersonalizada}${textoBase}` : textoBase;

  if (destaquesAdicionais.length > 0) {
    resultado += `\n\nDestaques Exclusivos Líder Atacado:\n${destaquesAdicionais.join("\n")}`;
  }

  if (incluirMedidas && textoMedidas) {
    resultado += `\n\n${textoMedidas}`;
  }

  return resultado.trim();
}
