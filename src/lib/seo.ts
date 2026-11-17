export const DEFAULT_ORIGIN = "https://lideratacado.lovable.app";

export function resolveOrigin(origin?: string | undefined): string {
  if (origin && origin.trim()) {
    return origin.trim().replace(/\/+$/, "");
  }
  return DEFAULT_ORIGIN;
}

export function seo(o: {
  title: string;
  description: string;
  origin?: string | undefined;
  path?: string | undefined;
  image?: string | undefined;
  type?: string | undefined;
}) {
  const baseOrigin = resolveOrigin(o.origin);
  const path = o.path ?? "";
  const canonicalUrl = `${baseOrigin}${path.startsWith("/") ? path : `/${path}`}`;

  const img = o.image
    ? o.image.startsWith("http")
      ? o.image
      : `${baseOrigin}${o.image.startsWith("/") ? o.image : `/${o.image}`}`
    : `${baseOrigin}/og-image.jpg`;

  const meta: Record<string, string>[] = [
    { title: o.title },
    { name: "description", content: o.description },
    { property: "og:site_name", content: "Líder Atacado" },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:title", content: o.title },
    { property: "og:description", content: o.description },
    { property: "og:type", content: o.type ?? "website" },
    { property: "og:url", content: canonicalUrl },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
  ];

  if (img.startsWith("http")) {
    meta.push(
      { property: "og:image", content: img },
      { property: "og:image:alt", content: o.title },
      { name: "twitter:image", content: img },
      { name: "twitter:image:alt", content: o.title }
    );
  }

  return meta;
}

export function canonical(origin: string | undefined, path: string) {
  const base = resolveOrigin(origin);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return [{ rel: "canonical", href: `${base}${normalizedPath}` }];
}

export function schemaOrganization(origin?: string) {
  const base = resolveOrigin(origin);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: "Líder Atacado",
    url: base,
    logo: `${base}/favicon-32.png`,
    description: "Atacado de camisetas básicas em algodão Pima peruano e camisas polo masculinas direto de fábrica.",
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+55-47-99136-4084",
        contactType: "customer service",
        areaServed: "BR",
        availableLanguage: ["Portuguese"],
      },
    ],
    sameAs: [],
  };
}

export function schemaWebSite(origin?: string) {
  const base = resolveOrigin(origin);
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: "Líder Atacado",
    description: "Camisetas básicas e camisas polo no atacado a partir de 10 peças direto de fábrica.",
    publisher: {
      "@id": `${base}/#organization`,
    },
    inLanguage: "pt-BR",
  };
}

export function schemaBreadcrumbs(
  items: Array<{ name: string; path: string }>,
  origin?: string
) {
  const base = resolveOrigin(origin);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const itemUrl = item.path.startsWith("http")
        ? item.path
        : `${base}${item.path.startsWith("/") ? item.path : `/${item.path}`}`;
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: itemUrl,
      };
    }),
  };
}
