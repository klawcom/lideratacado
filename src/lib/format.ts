export function onlyDigits(v: string): string {
  return (v ?? "").replace(/\D+/g, "");
}

/** "1.234,50" (no currency symbol) */
export function money(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "R$ 1.234,50" */
export function brl(n: number): string {
  return `R$ ${money(n)}`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function padNumero(n: number | string): string {
  return String(n).padStart(4, "0");
}

export function maskCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** (66) 99644-4461 — accepts 10 or 11 digit Brazilian numbers (without +55). */
export function maskPhone(v: string): string {
  let d = onlyDigits(v);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (d.length === 11) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

/** "+55 (66) 99644-4461" from digits (with or without 55). */
export function formatWhatsappIntl(v: string): string {
  return `+55 ${maskPhone(v)}`;
}

/** Digits with country code, for wa.me links. */
export function whatsappLinkNumber(v: string): string {
  const d = onlyDigits(v);
  if (d.startsWith("55") && d.length >= 12) return d;
  return `55${d}`;
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function slugify(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDateTime(iso: string | Date, timeZone = "America/Cuiaba") {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { data, hora };
}

/** "Falta 1 peça" / "Faltam 5 peças" */
export function faltamPecas(n: number): string {
  return n === 1 ? "Falta 1 peça" : `Faltam ${n} peças`;
}
