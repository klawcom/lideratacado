import type { Qtd } from "./pricing";
import { TAMANHOS } from "./pricing";

export type CorDef = {
  nome: string;
  hex: string;
  border?: boolean;
};

/**
 * Cores padrão para todas as categorias da loja Líder Atacado.
 */
export const CORES_PADRAO: CorDef[] = [
  { nome: "Branca", hex: "#FFFFFF", border: true },
  { nome: "Preta", hex: "#111111" },
  { nome: "Azul", hex: "#2563EB" },
  { nome: "Azul Marinho", hex: "#1E3A8A" },
  { nome: "Azul Bebê", hex: "#93C5FD" },
  { nome: "Vermelho", hex: "#DC2626" },
  { nome: "Vinho", hex: "#7F1D1D" },
  { nome: "Verde", hex: "#16A34A" },
  { nome: "Verde Escuro", hex: "#14532D" },
  { nome: "Verde Musgo", hex: "#4D7C0F" },
  { nome: "Verde Claro", hex: "#86EFAC" },
  { nome: "Rosa Bebê", hex: "#FBCFE8" },
  { nome: "Pink", hex: "#EC4899" },
  { nome: "Marrom Claro", hex: "#A16207" },
  { nome: "Marrom Escuro", hex: "#451A03" },
  { nome: "Bege", hex: "#D4C5A9" },
  { nome: "Creme", hex: "#FEF3C7", border: true },
  { nome: "Off-white", hex: "#F5F5F0", border: true },
  { nome: "Laranja", hex: "#EA580C" },
  { nome: "Amarelo", hex: "#FACC15" },
  { nome: "Roxo", hex: "#7C3AED" },
];

export const MAPA_CORES = new Map(CORES_PADRAO.map((c) => [c.nome.toLowerCase(), c]));

export function getCorDef(nome: string): CorDef {
  return (
    MAPA_CORES.get(nome.toLowerCase()) ?? {
      nome,
      hex: "#888888",
    }
  );
}

/**
 * Decodifica as cores habilitadas de um anúncio armazenadas no campo composicao.
 * Se nenhuma cor específica estiver configurada, todas as cores padrão estão ativas.
 */
export function decodeCoresProduto(composicao: string | null | undefined): {
  composicaoLimpa: string;
  coresHabilitadas: string[];
} {
  const comp = composicao ?? "";
  const match = comp.match(/<!--cores:(.*?)-->/);
  const composicaoLimpa = comp.replace(/<!--cores:.*?-->/g, "").trim();

  if (!match || !match[1]) {
    return {
      composicaoLimpa,
      coresHabilitadas: CORES_PADRAO.map((c) => c.nome),
    };
  }

  try {
    const parsed = JSON.parse(match[1]);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return {
        composicaoLimpa,
        coresHabilitadas: parsed,
      };
    }
  } catch {
    /* fallback to default */
  }

  return {
    composicaoLimpa,
    coresHabilitadas: CORES_PADRAO.map((c) => c.nome),
  };
}

/**
 * Codifica a lista de cores selecionadas no campo composicao do produto.
 */
export function encodeCoresProduto(composicaoLimpa: string, coresSelecionadas: string[]): string {
  const base = composicaoLimpa.replace(/<!--cores:.*?-->/g, "").trim();
  // Se selecionou todas as cores ou nenhuma, não precisa poluir
  if (coresSelecionadas.length === 0 || coresSelecionadas.length === CORES_PADRAO.length) {
    return base;
  }
  return `${base}<!--cores:${JSON.stringify(coresSelecionadas)}-->`;
}

/**
 * Formata a linha de cor e tamanhos no padrão desejado:
 * Ex: "branca: 1-P, 2-M, 4-G, 2-GG"
 */
export function formatarCorTamanhos(cor: string, q: Qtd): string {
  const partes = TAMANHOS.filter((t) => (q[t.key] || 0) > 0).map((t) => `${q[t.key]}-${t.label}`);
  return partes.length ? `${cor.toLowerCase()}: ${partes.join(", ")}` : "";
}
