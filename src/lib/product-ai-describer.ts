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
}

export function detectarTipoTecido(nome: string, codigo?: string): TipoTecidoIA {
  const texto = `${nome} ${codigo || ""}`.toLowerCase();
  if (/plus\s*size|tamanho\s*especial|g1|g2/i.test(texto)) return "plus_size";
  if (/polo|piquet/i.test(texto)) return "piquet_duplo";
  if (/pima|cotton\s*pima|peruano/i.test(texto)) return "cotton_pima";
  return "cotton_pima"; // Padrão principal da loja
}

/**
 * Textos Mestres Oficiais com Autoridade de CEO (Máximo 750 caracteres).
 * Sem medidas repetidas (as medidas já possuem widget próprio na página).
 * Palavras-chave destacadas em negrito (**palavra**).
 */
export const DESCRICAO_CEO_COTTON_PIMA = `A camiseta que o cliente **pega, sente a malha e compra na hora**. Peça indispensável para quem busca **alto giro e lucro superior a 100%**.

• **Malha peruana Cotton Pima:** colhida à mão, fibras nobres com **toque de seda** e frescor térmico.
• **Com elastano: veste bem e não perde a forma:** costura ombro a ombro que **não deforma e não encolhe**.
• **Cores variadas (sortidas):** tingimento nobre que **não desbota** com as lavagens.
• **Tamanhos P ao GG:** modelagem moderna de **alto giro no varejo** e recompra garantida.

Compre direto de fábrica no atacado e garanta a peça mais lucrativa da sua arara!`;

export const DESCRICAO_CEO_POLO_PIQUET = `A polo definitiva para quem exige **sofisticação, elegância e alta margem de lucro**. Visual nobre com acabamento impecável de alfaiataria.

• **Malha Piquet Duplo Peruano:** gramatura encorpada, toque macio e **caimento alinhado**.
• **Gola e Punhos Estruturados:** entretela nobre que **não enrola e não deforma** após as lavagens.
• **Alta Lucratividade:** valor percebido de shopping, vendida fácil por **mais que o dobro do preço de atacado**.
• **Recompra Certa:** peça clássica indispensável que **fideliza clientes exigentes** o ano todo.

Abasteça sua loja direto da fábrica com a polo mais elogiada e vendida do mercado!`;

export const DESCRICAO_CEO_PLUS_SIZE = `Criada para liderar a categoria mais rentável e com **maior procura reprimida** do mercado. Elegância, conforto absoluto e caimento ergonômico.

• **Malha Cotton Pima Nobre:** tecido maleável, toque sedoso e **máximo frescor**, sem esquentar ou pinicar.
• **Modelagem Inteligente (G1 e G2):** caimento proporcional que **valoriza o corpo sem sobras**, com ombros no lugar.
• **Costuras e Gola Reforçadas:** alta durabilidade e firmeza estrutural para o dia a dia.
• **Margem de Lucro Excepcional:** baixa concorrência no padrão premium e **fidelização vitalícia**.

A peça indispensável para atender o público Plus Size com máxima excelência!`;

export const DESCRICAO_CEO_BASICA_PREMIUM = `O carro-chefe de vendas diárias da sua loja. Confeccionada em **algodão selecionado de fibra longa**, combinando conforto, versatilidade e preço de fábrica.

• **Toque Macio e Superfície Limpa:** malha penteada premium que não pinica e oferece **respirabilidade natural**.
• **Gola Canelada com Reforço:** pesponto duplo que não alarga e mantém a forma original.
• **Tingimento Reativo Duradouro:** cores vivas e nobres que **não desbotam**.
• **Giro Contínuo e Venda Casada:** a peça básica perfeita para faturar alto com **margem superior a 100%**.

O produto essencial para manter o caixa da sua loja girando todos os dias!`;

/**
 * Retorna a descrição padrão oficial de acordo com a categoria da peça.
 */
export function obterDescricaoPadraoCategoria(p: {
  nome?: string | null;
  codigo_modelo?: string | null;
  categoria_id?: string | null;
  categorias?: { slug?: string; nome?: string } | null;
}): string {
  const tipo = detectarTipoTecido(p.nome ?? "", p.codigo_modelo ?? "");
  switch (tipo) {
    case "piquet_duplo":
      return DESCRICAO_CEO_POLO_PIQUET;
    case "plus_size":
      return DESCRICAO_CEO_PLUS_SIZE;
    case "basica_premium":
      return DESCRICAO_CEO_BASICA_PREMIUM;
    case "cotton_pima":
    default:
      return DESCRICAO_CEO_COTTON_PIMA;
  }
}

/**
 * Identifica se a descrição atual é genérica, antiga ou se precisa ser substituída pela oficial.
 */
export function isDescricaoGenericaOuAntiga(descricao?: string | null): boolean {
  if (!descricao || !descricao.trim()) return true;
  const t = descricao.trim();
  if (/^Camiseta Pima Modelo/i.test(t)) return true;
  if (/^Camisa Polo Modelo/i.test(t)) return true;
  if (/^Camisetas Masculinas Plus Size Modelo/i.test(t)) return true;
  if (/Cores sortidas, conforme disponibilidade/i.test(t)) return true;
  if (/Camisa polo de caimento clássico e toque confortável/i.test(t)) return true;
  if (/Camiseta Plus Size confeccionada em malha especial/i.test(t)) return true;
  if (/Peça estratégica desenhada para posicionar sua loja no mais alto padrão/i.test(t)) return true;
  if (/A polo definitiva para lojistas e revendedores que exigem sofisticação/i.test(t)) return true;
  if (/Desenvolvida com autoridade técnica para liderar uma das categorias/i.test(t)) return true;
  if (/^A camiseta que o cliente pega, sente o tecido e já quer levar:$/m.test(t)) return true;
  return false;
}

/**
 * Obtém a descrição final para exibição e edição do produto,
 * garantindo que nenhum produto fique sem o texto profissional de alta conversão.
 */
export function obterDescricaoOficialProduto(p: {
  nome?: string | null;
  codigo_modelo?: string | null;
  descricao?: string | null;
  categoria_id?: string | null;
  categorias?: { slug?: string; nome?: string } | null;
}): string {
  if (!p.descricao || isDescricaoGenericaOuAntiga(p.descricao)) {
    return obterDescricaoPadraoCategoria(p);
  }
  // Remove eventuais blocos de medidas repetidos no banco para manter o limite de 750 caracteres
  const limpa = p.descricao.split(/Medidas aproximadas/i)[0]?.trim();
  return limpa && !isDescricaoGenericaOuAntiga(limpa) ? limpa : obterDescricaoPadraoCategoria(p);
}

/**
 * Motor gerador de descrição inteligente com autoridade de CEO (≤ 750 caracteres).
 */
export function gerarDescricaoIA(opcoes: GerarDescricaoOpcoes): string {
  const tipo = opcoes.tipoTecido || detectarTipoTecido(opcoes.nomeProduto, opcoes.codigoModelo);

  let textoBase = "";
  switch (tipo) {
    case "cotton_pima":
      textoBase = DESCRICAO_CEO_COTTON_PIMA;
      break;
    case "piquet_duplo":
      textoBase = DESCRICAO_CEO_POLO_PIQUET;
      break;
    case "plus_size":
      textoBase = DESCRICAO_CEO_PLUS_SIZE;
      break;
    case "basica_premium":
      textoBase = DESCRICAO_CEO_BASICA_PREMIUM;
      break;
  }

  // Se o texto gerado ultrapassar 750 caracteres por algum motivo, garante o limite estrito
  if (textoBase.length > 750) {
    return textoBase.slice(0, 747) + "...";
  }

  return textoBase.trim();
}
