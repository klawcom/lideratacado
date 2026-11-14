import type { PedidoCriado } from "./orders.functions";

const LAST = "lider-ultimo-pedido";
const FORM = "lider-dados-entrega";

export function salvarUltimoPedido(p: PedidoCriado) {
  try {
    sessionStorage.setItem(LAST, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
export function lerUltimoPedido(): PedidoCriado | null {
  try {
    const raw = sessionStorage.getItem(LAST);
    return raw ? (JSON.parse(raw) as PedidoCriado) : null;
  } catch {
    return null;
  }
}
export function salvarDadosEntrega(d: Record<string, string>) {
  try {
    localStorage.setItem(FORM, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}
export function lerDadosEntrega(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(FORM);
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}
