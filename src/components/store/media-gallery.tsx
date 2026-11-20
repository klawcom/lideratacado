import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { MidiaRow } from "@/lib/catalog.functions";
import { mediaUrl, ordenarMidias, youtubeId, youtubeThumb } from "@/lib/media";
import { cn } from "@/lib/utils";

function Slide({ m, alt, fallbackPoster, eager }: { m: MidiaRow; alt: string; fallbackPoster: string; eager: boolean }) {
  const [play, setPlay] = useState(false);
  const yt = youtubeId(m.video_externo);
  if (m.tipo === "foto" && m.url) {
    return (
      <div className="flex h-full w-full items-center justify-center p-2 sm:p-3">
        <img
          src={mediaUrl(m.url)}
          alt={alt}
          width={1200}
          height={1500}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-contain"
        />
      </div>
    );
  }
  if (yt) {
    return play ? (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&playsinline=1&rel=0`}
        title={alt}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <button type="button" onClick={() => setPlay(true)} className="relative h-full w-full" aria-label={`Assistir vídeo: ${alt}`}>
        <img src={m.capa_url ? mediaUrl(m.capa_url) : youtubeThumb(yt)} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute inset-0 grid place-items-center bg-foreground/10">
          <span className="grid size-16 place-items-center rounded-full bg-background/90 shadow-soft">
            <Play className="ml-1 size-7" />
          </span>
        </span>
      </button>
    );
  }
  if (m.tipo === "video" && m.url) {
    return (
      <video
        className="h-full w-full bg-muted object-contain"
        src={mediaUrl(m.url)}
        poster={m.capa_url ? mediaUrl(m.capa_url) : fallbackPoster || undefined}
        preload="none"
        muted
        playsInline
        controls
        loop
        aria-label={alt}
      />
    );
  }
  return null;
}

export function MediaGallery({ midias, nome }: { midias: MidiaRow[]; nome: string }) {
  const list = ordenarMidias(midias);
  const [idx, setIdx] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const firstPhoto = list.find((m) => m.tipo === "foto" && m.url);
  const fallbackPoster = firstPhoto ? mediaUrl(firstPhoto.url) : "";

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    const strip = thumbs.current;
    const btn = strip?.children[idx] as HTMLElement | undefined;
    if (!strip || !btn) return;
    const offset = btn.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
    strip.scrollTo({ left: Math.max(0, offset - (strip.clientWidth - btn.clientWidth) / 2), behavior: "smooth" });
  }, [idx]);

  if (list.length === 0) return <div className="aspect-[4/5] rounded-2xl sm:rounded-3xl bg-muted" />;

  return (
    <div className="min-w-0 max-w-full">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
          className="no-scrollbar flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {list.map((m, i) => (
            <div key={m.id} className="aspect-[4/5] w-full shrink-0 snap-center flex items-center justify-center">
              <Slide m={m} alt={`${nome}${list.length > 1 ? ` — mídia ${i + 1}` : ""}`} fallbackPoster={fallbackPoster} eager={i === 0} />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-semibold tabular-nums shadow-soft" aria-live="polite">
            {idx + 1} de {list.length}
          </span>
        )}
      </div>
      {list.length > 1 && (
        <div ref={thumbs} className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 max-w-full">
          {list.map((m, i) => {
            const yt = youtubeId(m.video_externo);
            const thumb =
              m.tipo === "foto" && m.url ? mediaUrl(m.url) : m.capa_url ? mediaUrl(m.capa_url) : yt ? youtubeThumb(yt) : fallbackPoster;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver mídia ${i + 1}`}
                aria-current={i === idx}
                className={cn(
                  "relative aspect-[4/5] w-12 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition",
                  i === idx ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border/60 opacity-70 hover:opacity-100",
                )}
              >
                {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />}
                {m.tipo === "video" && (
                  <span className="absolute inset-0 grid place-items-center">
                    <Play className="size-5 fill-background text-background drop-shadow" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
