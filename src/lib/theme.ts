export const THEME_KEY = "lider-tema";

/** Inline script that applies the saved theme before first paint. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export function setTheme(t: "light" | "dark") {
  document.documentElement.classList.toggle("dark", t === "dark");
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

/** Runtime override of the primary accent from the store settings. */
export function accentCss(hex: string | null | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex) || hex.toUpperCase() === "#C9A227") return "";
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const fg = L > 0.35 ? "oklch(0.2 0.02 70)" : "oklch(0.99 0 0)";
  return `:root,.dark{--primary:${hex};--primary-foreground:${fg};--ring:${hex};--chart-1:${hex};}`;
}
