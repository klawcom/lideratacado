import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, ZoomIn, ZoomOut } from "lucide-react";
import type { MidiaRow } from "@/lib/catalog.functions";
import { mediaUrl, ordenarMidias, youtubeId, youtubeThumb } from "@/lib/media";
import { getCorDef } from "@/lib/colors";
import { cn } from "@/lib/utils";
import seloBlackFridayImg from "@/assets/selo-black-friday.webp";

function Slide({
  m,
  alt,
  fallbackPoster,
  eager,
  isZoomed,
  corDaFoto,
  onToggleZoom,
}: {
  m: MidiaRow;
  alt: string;
  fallbackPoster: string;
  eager: boolean;
  isZoomed: boolean;
  corDaFoto?: string;
  onToggleZoom: () => void;
}) {
  const [play, setPlay] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const yt = youtubeId(m.video_externo);

  if (m.tipo === "foto" && m.url) {
    return (
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden select-none"
        onClick={(e) => {
          if (!isZoomed) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            setOrigin({ x, y });
          }
          onToggleZoom();
        }}
        onMouseMove={(e) => {
          if (!isZoomed) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
          setOrigin({ x, y });
        }}
        onMouseLeave={() => {
          if (isZoomed) onToggleZoom();
        }}
        onTouchMove={(e) => {
          if (!isZoomed || e.touches.length === 0) return;
          const touch = e.touches[0];
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
          const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
          setOrigin({ x, y });
        }}
        style={{ cursor: isZoomed ? "zoom-out" : "zoom-in" }}
      >
        <img
          src={mediaUrl(m.url)}
          alt={alt}
          width={1200}
          height={1500}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={cn(
            "h-full w-full object-contain p-2 sm:p-3 transition-transform duration-300 ease-out will-change-transform select-none",
            isZoomed ? "scale-[2.2] pointer-events-none" : "scale-100",
          )}
          style={{
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isZoomed) {
              setOrigin({ x: 50, y: 50 });
            }
            onToggleZoom();
          }}
          aria-label={isZoomed ? "Reduzir zoom da imagem" : "Ampliar imagem"}
          title={isZoomed ? "Reduzir zoom" : "Clique para ampliar"}
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-background/80 hover:bg-background text-foreground/80 hover:text-foreground backdrop-blur-xs border border-border/40 shadow-xs transition-transform active:scale-95 before:absolute before:-inset-1.5 before:content-['']"
        >
          {isZoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
        </button>
        {corDaFoto && (
          <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground backdrop-blur-xs border border-border/50 shadow-xs">
            <span
              className="size-2 rounded-full border border-black/20"
              style={{ backgroundColor: getCorDef(corDaFoto).hex }}
            />
            Cor: {corDaFoto}
          </span>
        )}
        {isZoomed && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-xs shadow-xs animate-in fade-in duration-200">
            Toque ou clique para voltar
          </div>
        )}
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

export function MediaGallery({
  midias,
  nome,
  corAtiva,
  fotoCores,
  exibirSelo = false,
}: {
  midias: MidiaRow[];
  nome: string;
  corAtiva?: string;
  fotoCores?: Record<string, string>;
  exibirSelo?: boolean;
}) {
  const list = ordenarMidias(midias);
  const [idx, setIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const firstPhoto = list.find((m) => m.tipo === "foto" && m.url);
  const fallbackPoster = firstPhoto ? mediaUrl(firstPhoto.url) : "";

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!thumbs.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - thumbs.current.offsetLeft;
    scrollLeftRef.current = thumbs.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !thumbs.current) return;
    const x = e.pageX - thumbs.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
      thumbs.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 50);
  };

  function go(i: number) {
    setIsZoomed(false);
    const target = Math.max(0, Math.min(list.length - 1, i));
    const el = track.current;
    if (!el) return;
    setIdx(target);
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
    } else {
      el.scrollLeft = target * el.clientWidth;
    }
  }

  // Quando o cliente clica numa cor, desliza suavemente para a foto correspondente
  useEffect(() => {
    if (!corAtiva || !fotoCores) return;
    const targetIdx = list.findIndex((m) => {
      const c = fotoCores[m.id] || (m.url ? fotoCores[m.url] : null);
      return c && c.toLowerCase() === corAtiva.toLowerCase();
    });
    if (targetIdx !== -1) {
      go(targetIdx);
    }
  }, [corAtiva, fotoCores]);

  useEffect(() => {
    setIsZoomed(false);
  }, [idx]);

  useEffect(() => {
    const strip = thumbs.current;
    const btn = strip?.children[idx] as HTMLElement | undefined;
    if (!strip || !btn) return;
    const offset = btn.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
    const left = Math.max(0, offset - (strip.clientWidth - btn.clientWidth) / 2);
    if (typeof strip.scrollTo === "function") {
      strip.scrollTo({ left, behavior: "smooth" });
    } else {
      strip.scrollLeft = left;
    }
  }, [idx]);

  if (list.length === 0) return <div className="aspect-[4/5] rounded-2xl sm:rounded-3xl bg-muted" />;

  return (
    <div
      className="min-w-0 max-w-full focus:outline-none"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(idx - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(idx + 1);
        } else if (e.key === "Escape" && isZoomed) {
          setIsZoomed(false);
        }
      }}
    >
      <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20">
        <div
          ref={track}
          onScroll={(e) => {
            if (isZoomed) return;
            const el = e.currentTarget;
            setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
          className={cn(
            "no-scrollbar flex aspect-[4/5] w-full snap-x snap-mandatory overscroll-x-contain",
            isZoomed ? "overflow-hidden" : "overflow-x-auto",
          )}
        >
          {list.map((m, i) => (
            <div key={m.id} className="aspect-[4/5] w-full shrink-0 snap-center flex items-center justify-center">
              <Slide
                m={m}
                alt={`${nome}${list.length > 1 ? ` — mídia ${i + 1}` : ""}`}
                fallbackPoster={fallbackPoster}
                eager={i === 0}
                isZoomed={isZoomed && i === idx}
                corDaFoto={fotoCores ? fotoCores[m.id] || (m.url ? fotoCores[m.url] : undefined) : undefined}
                onToggleZoom={() => setIsZoomed((prev) => !prev)}
              />
            </div>
          ))}
        </div>

        {/* Selo Black Friday no topo superior direito */}
        {exibirSelo && !isZoomed && (
          <div className="pointer-events-none absolute right-2.5 top-2.5 z-10 select-none drop-shadow-md sm:right-4 sm:top-4">
            <img
              src={seloBlackFridayImg}
              alt="Black Friday - Aproveite Já"
              width={180}
              height={120}
              className="h-10 w-auto sm:h-14 md:h-16 object-contain"
            />
          </div>
        )}

        {/* Setas discretas para avançar e retroceder */}
        {list.length > 1 && !isZoomed && (
          <>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              disabled={idx === 0}
              aria-label="Imagem anterior"
              className={cn(
                "absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 flex size-9 sm:size-10 items-center justify-center rounded-full bg-background/80 text-foreground/85 shadow-md backdrop-blur-xs border border-border/40 transition-all hover:bg-background hover:text-foreground hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary before:absolute before:-inset-1.5 before:content-['']",
                idx === 0 ? "opacity-0 pointer-events-none" : "opacity-80 hover:opacity-100",
              )}
            >
              <ChevronLeft className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => go(idx + 1)}
              disabled={idx === list.length - 1}
              aria-label="Próxima imagem"
              className={cn(
                "absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 flex size-9 sm:size-10 items-center justify-center rounded-full bg-background/80 text-foreground/85 shadow-md backdrop-blur-xs border border-border/40 transition-all hover:bg-background hover:text-foreground hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary before:absolute before:-inset-1.5 before:content-['']",
                idx === list.length - 1 ? "opacity-0 pointer-events-none" : "opacity-80 hover:opacity-100",
              )}
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}

        {list.length > 1 && !isZoomed && (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-semibold tabular-nums shadow-soft" aria-live="polite">
            {idx + 1} de {list.length}
          </span>
        )}
      </div>

      {list.length > 1 && (
        <div className="relative mt-2.5 flex items-center gap-1.5 sm:gap-2">
          {/* Seta discreta para retroceder nas miniaturas */}
          <button
            type="button"
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            aria-label="Miniatura anterior"
            title="Ver imagem anterior"
            className={cn(
              "relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground/80 shadow-xs backdrop-blur-xs transition-all hover:bg-background hover:text-foreground hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary before:absolute before:-inset-2 before:content-['']",
              idx === 0 ? "opacity-25 pointer-events-none cursor-not-allowed" : "opacity-90 hover:opacity-100",
            )}
          >
            <ChevronLeft className="size-4 sm:size-5" />
          </button>

          <div
            ref={thumbs}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="no-scrollbar flex-1 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 max-w-full cursor-grab active:cursor-grabbing select-none"
          >
            {list.map((m, i) => {
              const yt = youtubeId(m.video_externo);
              const thumb =
                m.tipo === "foto" && m.url ? mediaUrl(m.url) : m.capa_url ? mediaUrl(m.capa_url) : yt ? youtubeThumb(yt) : fallbackPoster;
              const thumbCor = fotoCores ? fotoCores[m.id] || (m.url ? fotoCores[m.url] : undefined) : undefined;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (!hasDraggedRef.current) go(i);
                  }}
                  aria-label={`Ver mídia ${i + 1}`}
                  aria-current={i === idx}
                  className={cn(
                    "relative aspect-[4/5] w-12 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted transition",
                    i === idx ? "border-primary ring-2 ring-primary/20 scale-105" : "border-border/60 opacity-70 hover:opacity-100",
                  )}
                >
                  {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover pointer-events-none" />}
                  {thumbCor && (
                    <span
                      className="absolute top-1 right-1 size-2 rounded-full border border-background shadow-xs z-10"
                      style={{ backgroundColor: getCorDef(thumbCor).hex }}
                      title={`Foto da cor ${thumbCor}`}
                    />
                  )}
                  {m.tipo === "video" && (
                    <span className="absolute inset-0 grid place-items-center">
                      <Play className="size-5 fill-background text-background drop-shadow" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Seta discreta para avançar nas miniaturas */}
          <button
            type="button"
            onClick={() => go(idx + 1)}
            disabled={idx === list.length - 1}
            aria-label="Próxima miniatura"
            title="Ver próxima imagem"
            className={cn(
              "relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground/80 shadow-xs backdrop-blur-xs transition-all hover:bg-background hover:text-foreground hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary before:absolute before:-inset-2 before:content-['']",
              idx === list.length - 1 ? "opacity-25 pointer-events-none cursor-not-allowed" : "opacity-90 hover:opacity-100",
            )}
          >
            <ChevronRight className="size-4 sm:size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
