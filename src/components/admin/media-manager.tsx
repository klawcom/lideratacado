import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Camera, ImagePlus, Loader2, Play, Star, Trash2, Youtube } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Panel, invalidateStore } from "./ui";
import { mediaUrl, youtubeId, youtubeThumb } from "@/lib/media";
import { resizeToWebp, videoPoster } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

const MAX_VIDEO = 50 * 1024 * 1024;
const isStoragePath = (u: string | null) => !!u && !/^https?:\/\//.test(u) && !u.startsWith("/") && !u.startsWith("exemplos/");

export function MediaManager({ produtoId }: { produtoId: string }) {
  const qc = useQueryClient();
  const key = ["admin", "midias", produtoId];
  const { data: midias = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("produto_midias").select("*").eq("produto_id", produtoId).order("ordem");
      if (error) throw error;
      return data;
    },
  });
  const [progress, setProgress] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [yt, setYt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    invalidateStore(qc);
  };

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    let ordem = midias.reduce((m, x) => Math.max(m, x.ordem), -1) + 1;
    let temPrincipal = midias.some((m) => m.principal);
    let ok = 0;
    for (const [n, file] of list.entries()) {
      setProgress(`Enviando ${n + 1} de ${list.length}...`);
      try {
        const id = crypto.randomUUID();
        if (file.type.startsWith("image/")) {
          const blob = await resizeToWebp(file, 1600);
          const path = `${produtoId}/${id}.webp`;
          const { error } = await supabase.storage.from("produtos").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
          if (error) throw error;
          const { error: e2 } = await supabase.from("produto_midias").insert({ produto_id: produtoId, tipo: "foto", url: path, ordem: ordem++, principal: !temPrincipal });
          if (e2) throw e2;
          temPrincipal = true;
        } else if (file.type.startsWith("video/")) {
          if (file.size > MAX_VIDEO) {
            toast.error(`${file.name}: o vídeo passa de 50 MB.`);
            continue;
          }
          const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
          const path = `${produtoId}/${id}.${ext}`;
          const { error } = await supabase.storage.from("produtos").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
          if (error) throw error;
          let capa: string | null = null;
          const poster = await videoPoster(file);
          if (poster) {
            const capaPath = `${produtoId}/${id}-capa.webp`;
            const { error: pe } = await supabase.storage.from("produtos").upload(capaPath, poster, { contentType: "image/webp" });
            if (!pe) capa = capaPath;
          }
          const { error: e2 } = await supabase.from("produto_midias").insert({ produto_id: produtoId, tipo: "video", url: path, capa_url: capa, ordem: ordem++, principal: false });
          if (e2) throw e2;
        } else {
          toast.error(`${file.name}: formato não suportado.`);
          continue;
        }
        ok++;
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "falha no envio"}`);
      }
    }
    setProgress(null);
    if (ok) toast.success(`${ok} ${ok === 1 ? "arquivo enviado" : "arquivos enviados"}`);
    refresh();
  }

  async function addYoutube() {
    const id = youtubeId(yt);
    if (!id) { toast.error("Link do YouTube inválido."); return; }
    const ordem = midias.reduce((m, x) => Math.max(m, x.ordem), -1) + 1;
    const { error } = await supabase.from("produto_midias").insert({ produto_id: produtoId, tipo: "video", video_externo: `https://www.youtube.com/watch?v=${id}`, ordem, principal: false });
    if (error) { toast.error(error.message); return; }
    setYt("");
    refresh();
  }

  async function mover(i: number, dir: -1 | 1) {
    const list = [...midias];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j]!, list[i]!];
    await Promise.all(list.map((m, n) => supabase.from("produto_midias").update({ ordem: n }).eq("id", m.id)));
    refresh();
  }

  async function principal(id: string) {
    await supabase.from("produto_midias").update({ principal: false }).eq("produto_id", produtoId);
    await supabase.from("produto_midias").update({ principal: true }).eq("id", id);
    refresh();
  }

  async function excluir(m: (typeof midias)[number]) {
    if (!confirm("Excluir esta mídia?")) return;
    const paths = [m.url, m.capa_url].filter(isStoragePath) as string[];
    if (paths.length) await supabase.storage.from("produtos").remove(paths);
    const { error } = await supabase.from("produto_midias").delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  return (
    <Panel>
      <h2 className="font-sans text-lg font-bold tracking-normal">Fotos e vídeos</h2>
      <p className="text-sm text-muted-foreground">Fotos são reduzidas para no máximo 1600 px em WebP. Vídeos até 50 MB, sem som na loja.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={cn("mt-4 rounded-2xl border-2 border-dashed p-5 text-center transition", drag ? "border-primary bg-accent" : "border-input")}
      >
        {progress ? (
          <p className="flex min-h-11 items-center justify-center gap-2 font-medium">
            <Loader2 className="size-5 animate-spin" /> {progress}
          </p>
        ) : (
          <>
            <p className="hidden text-muted-foreground md:block">Arraste fotos e vídeos aqui ou</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <ImagePlus /> Escolher da galeria
              </Button>
              <Button type="button" variant="outline" onClick={() => camRef.current?.click()}>
                <Camera /> Câmera
              </Button>
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files).then(() => (e.target.value = ""))} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files && upload(e.target.files).then(() => (e.target.value = ""))} />
      </div>

      <div className="mt-3 flex gap-2">
        <Input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="Colar link do YouTube" inputMode="url" autoCapitalize="none" />
        <Button type="button" variant="secondary" onClick={addYoutube} disabled={!yt.trim()} aria-label="Adicionar vídeo do YouTube">
          <Youtube /> <span className="hidden sm:inline">Adicionar</span>
        </Button>
      </div>

      {midias.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {midias.map((m, i) => {
            const ytId = youtubeId(m.video_externo);
            const thumb = m.tipo === "foto" ? mediaUrl(m.url) : m.capa_url ? mediaUrl(m.capa_url) : ytId ? youtubeThumb(ytId) : "";
            return (
              <li key={m.id} className={cn("overflow-hidden rounded-2xl border bg-background", m.principal && "ring-2 ring-primary")}>
                <div className="relative aspect-square bg-muted">
                  {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : <video src={mediaUrl(m.url)} preload="metadata" muted className="h-full w-full object-cover" />}
                  {m.tipo === "video" && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold">
                      <Play className="size-3" /> {ytId ? "YouTube" : "Vídeo"}
                    </span>
                  )}
                  {m.principal && <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">Principal</span>}
                </div>
                <div className="grid grid-cols-4">
                  <Button type="button" variant="ghost" size="icon" className="w-full rounded-none" aria-label="Mover para trás" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp className="-rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="w-full rounded-none" aria-label="Mover para frente" disabled={i === midias.length - 1} onClick={() => mover(i, 1)}>
                    <ArrowDown className="-rotate-90" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="w-full rounded-none" aria-label="Definir como principal" onClick={() => principal(m.id)}>
                    <Star className={cn(m.principal && "fill-primary text-primary")} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="w-full rounded-none text-destructive hover:text-destructive" aria-label="Excluir" onClick={() => excluir(m)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
