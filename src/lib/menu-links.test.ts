import { describe, expect, it } from "vitest";
import { normalizeMenuLinks, visibleMenuLinks } from "./menu-links";

describe("menu links", () => {
  it("hides a page the admin turned off", () => {
    const v = visibleMenuLinks([{ to: "/faq", label: "Dúvidas", visivel: false }]);
    expect(v.map((l) => l.to)).not.toContain("/faq");
    expect(v).toHaveLength(4);
  });
  it("uses the name the admin typed and keeps the saved order", () => {
    const v = normalizeMenuLinks([{ to: "/sobre", label: "Quem somos", visivel: true }]);
    expect(v[0]).toEqual({ to: "/sobre", label: "Quem somos", visivel: true });
  });
  it("falls back to all five default pages when nothing is saved", () => {
    expect(normalizeMenuLinks(null)).toHaveLength(5);
  });
  it("aceita objeto com links e configurações adicionais como superfrete", () => {
    const raw = {
      links: [{ to: "/sobre", label: "História", visivel: true }],
      superfrete: { token: "123", cep_origem: "78464222" },
    };
    const v = normalizeMenuLinks(raw);
    expect(v[0]).toEqual({ to: "/sobre", label: "História", visivel: true });
    expect(v).toHaveLength(5);
  });
});
