/**
 * Pure helpers for the panel's folder import: one subfolder = one product.
 * No browser or database code here so it can be unit-tested.
 */

export type Arquivo<F = File> = { path: string; file: F };
export type Grupo<F = File> = { pasta: string; fotos: Arquivo<F>[]; videos: Arquivo<F>[] };

const FOTO_EXT = ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"];
const VIDEO_EXT = ["mp4", "mov", "m4v", "webm"];

export function extensao(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i < 0 ? "" : nome.slice(i + 1).toLowerCase();
}

export function tipoArquivo(nome: string): "foto" | "video" | null {
  const ext = extensao(nome);
  if (FOTO_EXT.includes(ext)) return "foto";
  if (VIDEO_EXT.includes(ext)) return "video";
  return null;
}

const comparar = (a: string, b: string) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });

/**
 * Groups files by the first subfolder inside the chosen folder.
 * Files placed directly in the chosen folder form one product named after it.
 */
export function agruparArquivos<F>(arquivos: Arquivo<F>[]): Grupo<F>[] {
  const grupos = new Map<string, Grupo<F>>();
  for (const a of arquivos) {
    const partes = a.path.replace(/\\/g, "/").split("/").filter(Boolean);
    const nome = partes[partes.length - 1] ?? "";
    if (!nome || nome.startsWith(".") || partes.some((p) => p.startsWith("__MACOSX"))) continue;
    const tipo = tipoArquivo(nome);
    if (!tipo) continue;
    const pasta = (partes.length >= 3 ? partes[1] : partes[0]) ?? "";
    if (!pasta) continue;
    const g = grupos.get(pasta) ?? { pasta, fotos: [], videos: [] };
    (tipo === "foto" ? g.fotos : g.videos).push(a);
    grupos.set(pasta, g);
  }
  const lista = [...grupos.values()].sort((a, b) => comparar(a.pasta, b.pasta));
  for (const g of lista) {
    g.fotos.sort((a, b) => comparar(a.path, b.path));
    g.videos.sort((a, b) => comparar(a.path, b.path));
  }
  return lista;
}

/** Brand names (and the abbreviations used to disguise them) that must never appear on the site. */
const MARCAS = [
  "armani", "emporio armani", "armani exchange", "calvin klein", "calvin", "klein", "lacoste", "ralph lauren", "ralph", "lauren",
  "polo ralph", "tommy hilfiger", "tommy", "hilfiger", "diesel", "fred perry", "hugo boss", "hugo", "boss", "prada", "aramis",
  "nike", "adidas", "gucci", "versace", "burberry", "dolce", "gabbana", "dior", "louis vuitton", "balenciaga", "moncler",
  "guess", "osklen", "reserva", "levis", "puma", "fila", "mizuno", "oakley", "quiksilver", "hurley", "vans", "zara",
  "abercrombie", "hollister", "gap", "colcci", "ellus", "john john", "dudalina", "aeropostale", "kenzo", "givenchy",
  "fendi", "valentino", "supreme", "off white", "lost", "billabong", "element", "mcd", "ck", "rl", "ax", "ea",
  // disguised abbreviations seen in supplier folders
  "armn", "xchng", "arms", "clvn", "kln", "prd", "empr", "frd", "prry", "hg", "bss", "lcst", "pl", "rlph", "lrn",
  "tmmy", "hlfgr", "dsl",
];

function tokens(v: string): string[] {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

const MARCAS_TOKENS = MARCAS.map(tokens);

export function temMarca(nome: string): boolean {
  const t = tokens(nome);
  return MARCAS_TOKENS.some((m) => t.some((_, i) => m.every((w, j) => t[i + j] === w)));
}

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "em", "a", "o"]);

export function capitalizar(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      if (/\d/.test(w)) return w.toUpperCase();
      const lower = w.toLocaleLowerCase("pt-BR");
      if (i > 0 && MINUSCULAS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
    })
    .join(" ");
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function codigoModelo(prefixo: string, n: number): string {
  const p = prefixo.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "") || "MOD";
  return `${p}-${pad2(n)}`;
}

/** Folder name → product title. Names with a brand become "<nomeModelo> Modelo NN". */
export function tituloDaPasta(pasta: string, n: number, nomeModelo: string): { titulo: string; trocado: boolean } {
  const limpo = pasta.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!limpo || temMarca(limpo)) return { titulo: `${nomeModelo.trim() || "Modelo"} Modelo ${pad2(n)}`.replace(/\bModelo Modelo\b/, "Modelo"), trocado: true };
  return { titulo: capitalizar(limpo), trocado: false };
}

/** Storage paths for imported files, deterministic so a re-run resumes instead of duplicating. */
export function caminhoFoto(codigo: string, i: number) {
  return `products/${codigo}/${pad2(i)}.webp`;
}
export function caminhoVideo(codigo: string, i: number, nomeOriginal: string) {
  const ext = extensao(nomeOriginal).replace(/[^a-z0-9]/g, "") || "mp4";
  return `products/${codigo}/video-${pad2(i)}.${ext}`;
}
export function caminhoCapa(codigo: string, i: number) {
  return `products/${codigo}/video-${pad2(i)}-capa.webp`;
}

export const FAIXAS_PADRAO = [10, 20, 30, 50] as const;
