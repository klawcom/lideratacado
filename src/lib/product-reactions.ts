export type ReactionType = "joinha" | "coracao" | "dinheiro" | "espanto" | "fogo";

export interface ReactionConfig {
  id: ReactionType;
  emoji: string;
  label: string;
  descricao: string;
}

export const REACTION_CONFIGS: ReactionConfig[] = [
  { id: "joinha", emoji: "👍", label: "Aprovado", descricao: "Gostei da peça" },
  { id: "coracao", emoji: "❤️", label: "Amei", descricao: "Excelente caimento" },
  { id: "dinheiro", emoji: "🤑", label: "Dá Lucro", descricao: "Alta margem de revenda" },
  { id: "espanto", emoji: "😲", label: "Uau!", descricao: "Qualidade impressionante" },
  { id: "fogo", emoji: "🔥", label: "Em Alta", descricao: "Mais vendido / Alto giro" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Gera contagens base determinísticas para cada produto,
 * mantendo estabilidade visual e parecendo orgânico.
 */
export function gerarContagensBase(produtoId: string): Record<ReactionType, number> {
  const seed = hashString(produtoId || "produto-default");
  return {
    joinha: 22 + (seed % 28), // 22 a 49
    coracao: 35 + ((seed >> 2) % 36), // 35 a 70
    dinheiro: 28 + ((seed >> 4) % 32), // 28 a 59
    espanto: 12 + ((seed >> 6) % 18), // 12 a 29
    fogo: 42 + ((seed >> 8) % 45), // 42 a 86
  };
}

const STORAGE_PREFIX = "lider_reacao_prod_";
const DELTA_PREFIX = "lider_delta_prod_";

export function obterReacaoUsuario(produtoId: string): ReactionType | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const val = window.localStorage.getItem(`${STORAGE_PREFIX}${produtoId}`);
    if (val && REACTION_CONFIGS.some((r) => r.id === val)) {
      return val as ReactionType;
    }
    return null;
  } catch {
    return null;
  }
}

export function obterContagensProduto(produtoId: string): {
  contagens: Record<ReactionType, number>;
  reacaoUsuario: ReactionType | null;
  total: number;
} {
  const base = gerarContagensBase(produtoId);
  const reacaoUsuario = obterReacaoUsuario(produtoId);

  let deltas: Partial<Record<ReactionType, number>> = {};
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(`${DELTA_PREFIX}${produtoId}`);
      if (raw) deltas = JSON.parse(raw);
    } catch {
      // Ignora erro
    }
  }

  const contagens: Record<ReactionType, number> = {
    joinha: Math.max(0, base.joinha + (deltas.joinha || 0)),
    coracao: Math.max(0, base.coracao + (deltas.coracao || 0)),
    dinheiro: Math.max(0, base.dinheiro + (deltas.dinheiro || 0)),
    espanto: Math.max(0, base.espanto + (deltas.espanto || 0)),
    fogo: Math.max(0, base.fogo + (deltas.fogo || 0)),
  };

  const total = Object.values(contagens).reduce((acc, v) => acc + v, 0);

  return { contagens, reacaoUsuario, total };
}

/**
 * Permite que qualquer pessoa reaja exatamente uma vez por produto.
 * Se já reagiu com o mesmo emoji, remove a reação (toggle off).
 * Se reagiu com outro emoji, remove a reação anterior e aplica a nova.
 */
export function alternarReacaoUsuario(
  produtoId: string,
  novaReacao: ReactionType,
): {
  contagens: Record<ReactionType, number>;
  reacaoUsuario: ReactionType | null;
  total: number;
} {
  const reacaoAtual = obterReacaoUsuario(produtoId);
  let proximaReacao: ReactionType | null = null;
  const deltas: Record<ReactionType, number> = {
    joinha: 0,
    coracao: 0,
    dinheiro: 0,
    espanto: 0,
    fogo: 0,
  };

  if (reacaoAtual === novaReacao) {
    // Desmarca a reação atual
    proximaReacao = null;
  } else {
    // Altera ou define a nova reação
    proximaReacao = novaReacao;
    deltas[novaReacao] = 1;
  }

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      if (proximaReacao) {
        window.localStorage.setItem(`${STORAGE_PREFIX}${produtoId}`, proximaReacao);
      } else {
        window.localStorage.removeItem(`${STORAGE_PREFIX}${produtoId}`);
      }
      window.localStorage.setItem(`${DELTA_PREFIX}${produtoId}`, JSON.stringify(deltas));
    } catch {
      // Ignora erro de cota
    }
  }

  const base = gerarContagensBase(produtoId);
  const contagens: Record<ReactionType, number> = {
    joinha: Math.max(0, base.joinha + (deltas.joinha || 0)),
    coracao: Math.max(0, base.coracao + (deltas.coracao || 0)),
    dinheiro: Math.max(0, base.dinheiro + (deltas.dinheiro || 0)),
    espanto: Math.max(0, base.espanto + (deltas.espanto || 0)),
    fogo: Math.max(0, base.fogo + (deltas.fogo || 0)),
  };

  const total = Object.values(contagens).reduce((acc, v) => acc + v, 0);

  return {
    contagens,
    reacaoUsuario: proximaReacao,
    total,
  };
}

export function obterReacaoDestaque(produtoId: string): {
  id: ReactionType;
  emoji: string;
  label: string;
  count: number;
} {
  const { contagens } = obterContagensProduto(produtoId);
  let maxId: ReactionType = "fogo";
  let maxCount = -1;

  for (const config of REACTION_CONFIGS) {
    const val = contagens[config.id];
    if (val > maxCount) {
      maxCount = val;
      maxId = config.id;
    }
  }

  const config = REACTION_CONFIGS.find((r) => r.id === maxId) || REACTION_CONFIGS[4];
  return {
    id: config.id,
    emoji: config.emoji,
    label: config.label,
    count: maxCount,
  };
}
