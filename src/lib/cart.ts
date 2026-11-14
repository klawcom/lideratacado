import { useSyncExternalStore } from "react";
import type { FaixaPreco, Qtd } from "./pricing";

export type CartItem = {
  produtoId: string;
  nome: string;
  slug: string;
  codigo: string;
  imagem: string;
  faixas: FaixaPreco[];
  qtd: Qtd;
  observacao: string;
};

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
        p: cur.qtd.p + item.qtd.p,
        m: cur.qtd.m + item.qtd.m,
        g: cur.qtd.g + item.qtd.g,
        gg: cur.qtd.gg + item.qtd.gg,
      },
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
  return list.reduce((s, i) => s + i.qtd.p + i.qtd.m + i.qtd.g + i.qtd.gg, 0);
}
