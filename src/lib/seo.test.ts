import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORIGIN,
  canonical,
  resolveOrigin,
  schemaBreadcrumbs,
  schemaOrganization,
  schemaWebSite,
  seo,
} from "./seo";

describe("seo utilities", () => {
  it("resolves origin with fallback", () => {
    expect(resolveOrigin("")).toBe(DEFAULT_ORIGIN);
    expect(resolveOrigin(undefined)).toBe(DEFAULT_ORIGIN);
    expect(resolveOrigin("https://minhaloja.com.br/")).toBe("https://minhaloja.com.br");
  });

  it("generates complete meta tags with canonical and og tags", () => {
    const meta = seo({
      title: "Página Teste | Líder Atacado",
      description: "Descrição de teste para atacado",
      path: "/teste",
    });

    expect(meta.find((m) => m["title"])?.["title"]).toBe("Página Teste | Líder Atacado");
    expect(meta.find((m) => m["property"] === "og:url")?.["content"]).toBe(
      "https://lideratacado.lovable.app/teste"
    );
    expect(meta.find((m) => m["property"] === "og:locale")?.["content"]).toBe("pt_BR");
  });

  it("generates valid canonical links always", () => {
    const links = canonical(undefined, "/produto/camiseta");
    expect(links).toEqual([
      { rel: "canonical", href: "https://lideratacado.lovable.app/produto/camiseta" },
    ]);
  });

  it("generates Organization and WebSite schema.org objects", () => {
    const org = schemaOrganization("https://lideratacado.lovable.app");
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("Líder Atacado");

    const site = schemaWebSite("https://lideratacado.lovable.app");
    expect(site["@type"]).toBe("WebSite");
    expect(site.name).toBe("Líder Atacado");
  });

  it("generates BreadcrumbList schema.org objects", () => {
    const crumbs = schemaBreadcrumbs([
      { name: "Início", path: "/" },
      { name: "Camisetas", path: "/categoria/camisetas" },
      { name: "Pima Preta", path: "/produto/pima-preta" },
    ]);
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(crumbs.itemListElement).toHaveLength(3);
    expect(crumbs.itemListElement[0]?.position).toBe(1);
    expect(crumbs.itemListElement[2]?.name).toBe("Pima Preta");
  });
});
