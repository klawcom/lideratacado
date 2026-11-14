export function seo(o: { title: string; description: string; origin?: string; path?: string; image?: string; type?: string }) {
  const img = o.image ? (o.image.startsWith("http") ? o.image : o.origin ? `${o.origin}${o.image}` : "") : o.origin ? `${o.origin}/og-image.jpg` : "";
  const meta: Record<string, string>[] = [
    { title: o.title },
    { name: "description", content: o.description },
    { property: "og:title", content: o.title },
    { property: "og:description", content: o.description },
    { property: "og:type", content: o.type ?? "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
  ];
  if (o.origin && o.path !== undefined) meta.push({ property: "og:url", content: `${o.origin}${o.path}` });
  if (img.startsWith("http")) {
    meta.push({ property: "og:image", content: img }, { name: "twitter:image", content: img });
  }
  return meta;
}

export function canonical(origin: string | undefined, path: string) {
  return origin ? [{ rel: "canonical", href: `${origin}${path}` }] : [];
}
