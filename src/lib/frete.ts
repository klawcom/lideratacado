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
  desconto?: string;
  icone?: string;
};

export type SimulacaoFreteResultado = {
  sucesso: boolean;
  cepOrigem: string;
  cepDestino: string;
  pesoKg: number;
  totalPecas: number;
  opcoes: FreteOpcao[];
  mensagem?: string;
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
 * Define dimensões da embalagem (cm) conforme o volume de peças.
 * Mantém os limites mínimos permitidos pelos Correios (comprimento >= 15cm, largura >= 10cm, altura >= 2cm).
 */
export function calcularDimensoesPacote(totalPecas: number): { altura: number; largura: number; comprimento: number } {
  const n = Math.max(1, totalPecas);
  if (n <= 5) return { altura: 6, largura: 18, comprimento: 24 };
  if (n <= 15) return { altura: 10, largura: 22, comprimento: 28 };
  if (n <= 30) return { altura: 15, largura: 25, comprimento: 32 };
  if (n <= 50) return { altura: 20, largura: 28, comprimento: 36 };
  return { altura: 25, largura: 32, comprimento: 40 };
}

export function formatarPrazoFrete(dias: number): string {
  if (dias <= 1) return "Em até 1 dia útil";
  return `Em até ${dias} dias úteis`;
}
