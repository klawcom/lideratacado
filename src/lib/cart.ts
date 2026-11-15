import { useSyncExternalStore } from "react";
import { pecas, type FaixaPreco, type Qtd } from "./pricing";

export type CorQtd = {
  cor: string;
  qtd: Qtd;
};

export type CartItem = {
  produtoId: string;
  nome: string;
  slug: string;
  codigo: string;
  imagem: string;
  faixas: FaixaPreco[];
  qtd: Qtd;
  cores?: CorQtd[];
  observacao: string;
};

function mergeCores(c1?: CorQtd[], c2?: CorQtd[]): CorQtd[] | undefined {
  if (!c1?.length && !c2?.length) return undefined;
  const map = new Map<string, Qtd>();
  const add = (cq: CorQtd) => {
    const key = cq.cor.trim();
    const existing = map.get(key) || { p: 0, m: 0, g: 0, gg: 0, g1: 0, g2: 0 };
    map.set(key, {
      p: (existing.p || 0) + (cq.qtd.p || 0),
      m: (existing.m || 0) + (cq.qtd.m || 0),
      g: (existing.g || 0) + (cq.qtd.g || 0),
      gg: (existing.gg || 0) + (cq.qtd.gg || 0),
      g1: (existing.g1 || 0) + (cq.qtd.g1 || 0),
      g2: (existing.g2 || 0) + (cq.qtd.g2 || 0),
    });
  };
  (c1 || []).forEach(add);
  (c2 || []).forEach(add);
  return Array.from(map.entries())
    .map(([cor, qtd]) => ({ cor, qtd }))
    .filter((c) => pecas(c.qtd) > 0);
}

const KEY = "lider-carrinho-v1";
const EMPTY: CartItem[] = [];
let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    items = [];
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    emit();
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function save(next: CartItem[]) {
  items = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked */
  }
  emit();
}

export const cart = {
  get(): CartItem[] {
    load();
    return items;
  },
  subscribe(l: () => void) {
    load();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** Adding the same product again sums into the existing line. */
  add(item: CartItem) {
    const list = cart.get();
    const idx = list.findIndex((i) => i.produtoId === item.produtoId);
    if (idx === -1) return save([...list, item]);
    const cur = list[idx]!;
    const obs = [cur.observacao.trim(), item.observacao.trim()]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" / ")
      .slice(0, 300);
    const merged: CartItem = {
      ...cur,
      ...item,
      qtd: {
        p: (cur.qtd.p || 0) + (item.qtd.p || 0),
        m: (cur.qtd.m || 0) + (item.qtd.m || 0),
        g: (cur.qtd.g || 0) + (item.qtd.g || 0),
        gg: (cur.qtd.gg || 0) + (item.qtd.gg || 0),
        g1: (cur.qtd.g1 || 0) + (item.qtd.g1 || 0),
        g2: (cur.qtd.g2 || 0) + (item.qtd.g2 || 0),
      },
      cores: mergeCores(cur.cores, item.cores),
      observacao: obs,
    };
    save(list.map((i, n) => (n === idx ? merged : i)));
  },
  update(produtoId: string, patch: Partial<CartItem>) {
    save(cart.get().map((i) => (i.produtoId === produtoId ? { ...i, ...patch } : i)));
  },
  remove(produtoId: string) {
    save(cart.get().filter((i) => i.produtoId !== produtoId));
  },
  clear() {
    save([]);
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(cart.subscribe, cart.get, () => EMPTY);
}

export function useCartCount(): number {
  const list = useCart();
  return list.reduce((s, i) => s + pecas(i.qtd), 0);
}
