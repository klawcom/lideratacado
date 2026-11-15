import { round2 } from "./format";

/** Fixed price tiers, by total pieces in the whole order. */
export const FAIXAS = [10, 20, 30, 50] as const;
export type FaixaQtd = (typeof FAIXAS)[number];

export type FaixaPreco = { quantidade_minima: number; preco_peca: number };
export type Qtd = {
  p?: number;
  m?: number;
  g?: number;
  gg?: number;
  g1?: number;
  g2?: number;
};

export type TamanhoItem = { key: keyof Qtd; label: string };

export const TAMANHOS_PADRAO: TamanhoItem[] = [
  { key: "p", label: "P" },
  { key: "m", label: "M" },
  { key: "g", label: "G" },
  { key: "gg", label: "GG" },
];

export const TAMANHOS_PLUS_SIZE: TamanhoItem[] = [
  { key: "g1", label: "G1" },
  { key: "g2", label: "G2" },
];

export const TAMANHOS: TamanhoItem[] = [
  ...TAMANHOS_PADRAO,
  ...TAMANHOS_PLUS_SIZE,
];

export function pecas(q: Qtd): number {
  return (
    (q.p || 0) +
    (q.m || 0) +
    (q.g || 0) +
    (q.gg || 0) +
    (q.g1 || 0) +
    (q.g2 || 0)
  );
}

/** Tier for a total. Below 10 pieces the base tier (10) price is shown. */
export function faixaDoTotal(total: number): FaixaQtd {
  let f: FaixaQtd = FAIXAS[0];
  for (const q of FAIXAS) if (total >= q) f = q;
  return f;
}

/** Next tier above the current total, or null when already in the top tier. */
export function proximaFaixa(total: number): FaixaQtd | null {
  for (const q of FAIXAS) if (total < q && q > faixaDoTotal(total)) return q;
  return null;
}

/** Price per piece for a tier; falls back to the closest lower tier the product defines, then the lowest defined. */
export function precoNaFaixa(faixas: FaixaPreco[], faixa: number): number {
  const sorted = [...faixas]
    .filter((f) => Number.isFinite(Number(f.preco_peca)))
    .sort((a, b) => a.quantidade_minima - b.quantidade_minima);
  if (sorted.length === 0) return 0;
  let chosen = sorted[0]!;
  for (const f of sorted) if (f.quantidade_minima <= faixa) chosen = f;
  return Number(chosen.preco_peca);
}

export function menorPreco(faixas: FaixaPreco[]): number | null {
  if (!faixas?.length) return null;
  return Math.min(...faixas.map((f) => Number(f.preco_peca)));
}

export type LinhaEntrada = {
  produtoId: string;
  faixas: FaixaPreco[];
  qtd: Qtd;
};

export type LinhaCalculada<T extends LinhaEntrada> = T & {
  pecas: number;
  preco: number;
  valor: number;
  /** Price this item would have at the next tier, if any. */
  precoProxima: number | null;
};

export type Resumo<T extends LinhaEntrada> = {
  itens: LinhaCalculada<T>[];
  totalPecas: number;
  faixa: FaixaQtd;
  total: number;
  pedidoMinimo: number;
  faltamMinimo: number;
  podeFinalizar: boolean;
  proxima: { faixa: FaixaQtd; faltam: number } | null;
};

export function calcularPedido<T extends LinhaEntrada>(linhas: T[], pedidoMinimo = 10): Resumo<T> {
  const totalPecas = linhas.reduce((s, l) => s + pecas(l.qtd), 0);
  const faixa = faixaDoTotal(totalPecas);
  const prox = proximaFaixa(totalPecas);
  const itens = linhas.map((l) => {
    const n = pecas(l.qtd);
    const preco = precoNaFaixa(l.faixas, faixa);
    return {
      ...l,
      pecas: n,
      preco,
      valor: round2(preco * n),
      precoProxima: prox ? precoNaFaixa(l.faixas, prox) : null,
    };
  });
  const total = round2(itens.reduce((s, i) => s + i.valor, 0));
  const faltamMinimo = Math.max(0, pedidoMinimo - totalPecas);
  return {
    itens,
    totalPecas,
    faixa,
    total,
    pedidoMinimo,
    faltamMinimo,
    podeFinalizar: totalPecas > 0 && faltamMinimo === 0,
    proxima: prox ? { faixa: prox, faltam: prox - totalPecas } : null,
  };
}
