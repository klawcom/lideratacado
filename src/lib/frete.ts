import { onlyDigits } from "./format";

/**
 * Peso padrão por peça:
 * - Camiseta: 200g (0.20 kg)
 * - Polo: 250g (0.25 kg)
 */
export const PESO_CAMISETA_KG = 0.2;
export const PESO_POLO_KG = 0.25;

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
 * Calcula o peso total em kg de uma lista de itens.
 * Inclui pequena tara de embalagem (0.05 kg) e garante mínimo de 0.3 kg exigido pelos Correios.
 */
export function calcularPesoTotalKg(itens: ItemFrete[]): number {
  const pesoItens = itens.reduce((s, it) => s + Math.max(0, it.pecas) * pesoUnitarioKg(it.nome), 0);
  if (pesoItens <= 0) return 0.3;
  const pesoFinal = pesoItens + 0.05; // embalagem
  return Math.max(0.3, Math.round(pesoFinal * 100) / 100);
}

/**
 * Dimensões base para cálculo de frete (cm): altura 1cm, largura 8cm, comprimento 13cm.
 */
export const DIMENSOES_BASE = {
  altura: 1,
  largura: 8,
  comprimento: 13,
};

/**
 * Define dimensões da embalagem (cm).
 * Base fixa para todos os cálculos: altura 1cm, largura 8cm, comprimento 13cm.
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
