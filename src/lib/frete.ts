import { onlyDigits } from "./format";

/**
 * Peso padrão por peça:
 * - Camiseta: 200g (0.20 kg)
 * - Polo: 250g (0.25 kg)
 *
 * Regra especial de peso mínimo no atacado:
 * - Pedidos de até 10 peças: considera SEMPRE 4 kg (4.0 kg) para base de cálculo.
 * - Pedidos acima de 10 peças: 4 kg base (para as 10 primeiras) + peso real das peças excedentes.
 */
export const PESO_CAMISETA_KG = 0.2;
export const PESO_POLO_KG = 0.25;
export const PESO_MINIMO_ATE_10_PECAS_KG = 4.0;

export type ItemFrete = {
  nome: string;
  pecas: number;
};

export type FreteOpcao = {
  id: number;
  nome: string;
  transportadora: string;
  preco: number;
  prazoDias: number;
  desconto?: string | undefined;
  icone?: string | undefined;
};

export type SimulacaoFreteResultado = {
  sucesso: boolean;
  cepOrigem: string;
  cepDestino: string;
  pesoKg: number;
  totalPecas: number;
  opcoes: FreteOpcao[];
  mensagem?: string | undefined;
};

/**
 * Retorna o peso unitário em kg de acordo com o tipo de peça.
 * Identifica 'polo' no título do produto; caso contrário, considera camiseta (200g).
 */
export function pesoUnitarioKg(nome: string): number {
  return /polo/i.test(nome) ? PESO_POLO_KG : PESO_CAMISETA_KG;
}

/**
 * Calcula o peso total em kg de uma lista de itens para cálculo de frete.
 *
 * Regras:
 * - Pedidos de até 10 peças: considera SEMPRE 4 kg (4.0 kg).
 * - Pedidos com mais de 10 peças: base de 4.0 kg para as 10 primeiras + peso real das peças excedentes.
 * - Informações de peso e medidas são estritamente para base de cálculo da API e não são exibidas ao cliente.
 */
export function calcularPesoTotalKg(itens: ItemFrete[]): number {
  const totalPecas = itens.reduce((s, it) => s + Math.max(0, it.pecas), 0);
  if (totalPecas <= 10) {
    return PESO_MINIMO_ATE_10_PECAS_KG;
  }

  const pesoItensTotal = itens.reduce((s, it) => s + Math.max(0, it.pecas) * pesoUnitarioKg(it.nome), 0);
  const pesoMedioPorPeca = totalPecas > 0 ? pesoItensTotal / totalPecas : PESO_CAMISETA_KG;
  const pecasExcedentes = totalPecas - 10;
  const pesoCalculado = PESO_MINIMO_ATE_10_PECAS_KG + pecasExcedentes * pesoMedioPorPeca;

  return Math.max(PESO_MINIMO_ATE_10_PECAS_KG, Math.round(pesoCalculado * 100) / 100);
}

/**
 * Dimensões mínimas da caixa para cálculo de frete (cm):
 * altura = 1cm, largura = 8cm, comprimento = 13cm.
 * Medidas mínimas para que o peso físico prevaleça sobre o peso volumétrico.
 * Informações de uso estritamente interno para a API, nunca exibidas ao cliente.
 */
export const DIMENSOES_BASE = {
  altura: 1,
  largura: 8,
  comprimento: 13,
};

/**
 * Retorna as dimensões da embalagem para cálculo do frete (cm).
 * Medidas mínimas fixas: altura 1cm, largura 8cm, comprimento 13cm.
 */
export function calcularDimensoesPacote(_totalPecas?: number): { altura: number; largura: number; comprimento: number } {
  return { ...DIMENSOES_BASE };
}

export function formatarPrazoFrete(dias: number): string {
  if (dias <= 1) return "Em até 1 dia útil";
  return `Em até ${dias} dias úteis`;
}

/**
 * Retorna o caminho do logo oficial para o serviço de frete (PAC ou SEDEX).
 */
export function logoFrete(nomeOuServico?: string | null): string | null {
  if (!nomeOuServico) return null;
  const s = nomeOuServico.toUpperCase();
  if (s.includes("SEDEX")) return "/frete-sedex.png";
  if (s.includes("PAC")) return "/frete-pac.png";
  return null;
}
