/** Resolves a stored media reference to a URL the browser can load. */
export function mediaUrl(ref: string | null | undefined): string {
  if (!ref) return "";
  if (/^https?:\/\//i.test(ref) || ref.startsWith("/")) return ref;
  return `/api/public/midia/${ref.split("/").map(encodeURIComponent).join("/")}`;
}

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/) ??
    url.match(/^([A-Za-z0-9_-]{11})$/);
  return m?.[1] ?? null;
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export type Midia = {
  id?: string;
  tipo: "foto" | "video";
  url: string | null;
  video_externo: string | null;
  capa_url: string | null;
  ordem: number;
  principal: boolean;
};

export function ordenarMidias<T extends Pick<Midia, "ordem" | "principal">>(m: T[]): T[] {
  return [...(m ?? [])].sort((a, b) => Number(b.principal) - Number(a.principal) || a.ordem - b.ordem);
}

/** Image for cards / og: main photo, else video cover, else YouTube thumbnail. */
export function imagemPrincipal(m: Midia[] | undefined): string {
  const list = ordenarMidias(m ?? []);
  const foto = list.find((x) => x.tipo === "foto" && x.url);
  if (foto) return mediaUrl(foto.url);
  const capa = list.find((x) => x.capa_url);
  if (capa) return mediaUrl(capa.capa_url);
  const yt = list.map((x) => youtubeId(x.video_externo)).find(Boolean);
  return yt ? youtubeThumb(yt) : "";
}
