/** Service-page links shown in the store menu and footer; names/visibility are edited in the panel. */
export const MENU_PAGES = [
  { to: "/como-comprar", label: "Como comprar" },
  { to: "/sobre", label: "Sobre" },
  { to: "/faq", label: "Dúvidas frequentes" },
  { to: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
  { to: "/privacidade", label: "Política de privacidade" },
] as const;

export type MenuPath = (typeof MENU_PAGES)[number]["to"];
export type MenuLink = { to: MenuPath; label: string; visivel: boolean };

/** Accepts whatever is saved and always returns every known page once, in the saved order. */
export function normalizeMenuLinks(raw: unknown): MenuLink[] {
  const saved = Array.isArray(raw) ? raw : [];
  const out: MenuLink[] = [];
  for (const item of saved) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const page = MENU_PAGES.find((p) => p.to === r.to);
    if (!page || out.some((o) => o.to === page.to)) continue;
    const label = typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 40) : page.label;
    out.push({ to: page.to, label, visivel: r.visivel !== false });
  }
  for (const p of MENU_PAGES) if (!out.some((o) => o.to === p.to)) out.push({ to: p.to, label: p.label, visivel: true });
  return out;
}

export function visibleMenuLinks(raw: unknown): MenuLink[] {
  return normalizeMenuLinks(raw).filter((l) => l.visivel);
}
