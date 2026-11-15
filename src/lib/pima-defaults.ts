/**
 * Padrões de descrição, composição e medidas para anúncios da categoria Cotton Pima.
 */

export const DESCRICAO_COTTON_PIMA = `A camiseta que o cliente pega, sente o tecido e já quer levar:
✅ Malha peruana Cotton Pima, macia e resistente;
✅ Com elastano: veste bem e não perde a forma;
✅ Cores variadas (sortidas);
✅ Tamanhos P ao GG.`;

export const COMPOSICAO_COTTON_PIMA = "100% Algodão Pima";

export const MEDIDAS_COTTON_PIMA = [
  { tamanho: "P", largura: "50cm", altura: "63cm" },
  { tamanho: "M", largura: "52cm", altura: "66cm" },
  { tamanho: "G", largura: "55cm", altura: "69cm" },
  { tamanho: "GG", largura: "58cm", altura: "70cm" },
];

export const TEXTO_MEDIDAS_COTTON_PIMA = `Medidas aproximadas
CAMISETAS MASCULINAS
P. 50cm largura x 63cm altura
M. 52cm largura x 66cm altura
G. 55cm largura x 69cm altura
GG. 58cm largura x 70cm altura`;

export const DESCRICAO_COMPLETA_COTTON_PIMA = `${DESCRICAO_COTTON_PIMA}

${TEXTO_MEDIDAS_COTTON_PIMA}`;

/**
 * Identifica se um produto pertence à categoria Camisetas Cotton Pima.
 */
export function isProdutoCottonPima(p: {
  categoria_id?: string | null;
  codigo_modelo?: string | null;
  nome?: string | null;
  categorias?: { slug?: string; nome?: string } | null;
}): boolean {
  if (p.categoria_id === "11111111-1111-1111-1111-111111111111") return true;
  if (p.categorias?.slug === "camisetas-cotton-pima") return true;
  if (/cotton\s*pima/i.test(p.categorias?.nome ?? "")) return true;
  if (/cotton\s*pima/i.test(p.nome ?? "")) return true;
  if (/^PIMA/i.test(p.codigo_modelo ?? "")) return true;
  return false;
}

/**
 * Padrões de medidas e descrição para anúncios da categoria Polo.
 */
export const MEDIDAS_POLO = [
  { tamanho: "P", largura: "50cm", altura: "63cm" },
  { tamanho: "M", largura: "52cm", altura: "66cm" },
  { tamanho: "G", largura: "55cm", altura: "69cm" },
  { tamanho: "GG", largura: "58cm", altura: "70cm" },
];

export const TEXTO_MEDIDAS_POLO = `Medidas aproximadas

CAMISAS POLOS MASCULINAS
P. 50cm largura x 63cm altura
M. 52cm largura x 66cm altura
G. 55cm largura x 69cm altura
GG. 58cm largura x 70cm altura`;

export const DESCRICAO_BASE_POLO = `Camisa polo de caimento clássico e toque confortável. Cores sortidas, conforme disponibilidade do estoque.`;

export const DESCRICAO_COMPLETA_POLO = `${DESCRICAO_BASE_POLO}

${TEXTO_MEDIDAS_POLO}`;

/**
 * Identifica se um produto pertence à categoria Camisas Polo.
 */
export function isProdutoPolo(p: {
  categoria_id?: string | null;
  codigo_modelo?: string | null;
  nome?: string | null;
  categorias?: { slug?: string; nome?: string } | null;
}): boolean {
  if (p.categorias?.slug && /polo/i.test(p.categorias.slug)) return true;
  if (/polo/i.test(p.categorias?.nome ?? "")) return true;
  if (/polo/i.test(p.nome ?? "")) return true;
  if (/^POLO/i.test(p.codigo_modelo ?? "")) return true;
  return false;
}
