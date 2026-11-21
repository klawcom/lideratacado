import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  ImagePlus,
  Loader2,
  Play,
  Star,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Panel, invalidateStore } from "./ui";
import { mediaUrl, youtubeId, youtubeThumb } from "@/lib/media";
import { videoPoster } from "@/lib/image-resize";
import { cn } from "@/lib/utils";
import { CORES_PADRAO, decodeCoresProduto, encodeCoresProduto, getCorDef } from "@/lib/colors";

const MAX_VIDEO = 50 * 1024 * 1024;
const isStoragePath = (u: string | null) => !!u && !/^https?:\/\//.test(u) && !u.startsWith("/") && !u.startsWith("exemplos/");

export function MediaManager({
  produtoId,
  initialComposicao,
}: {
  produtoId: string;
  initialComposicao?: string | null;
}) {
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

  const { data: composicaoData } = useQuery({
    queryKey: ["admin", "produto-composicao-midias", produtoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("composicao").eq("id", produtoId).single();
      if (error) throw error;
      return data?.composicao ?? null;
    },
    initialData: initialComposicao !== undefined ? initialComposicao : undefined,
  });

  const { composicaoLimpa, coresHabilitadas, fotoCores } = decodeCoresProduto(
    composicaoData !== undefined ? composicaoData : initialComposicao,
  );

  async function associarCorFoto(midiaId: string, corNome: string) {
    const nextFotoCores = { ...fotoCores };
    if (!corNome) {
      delete nextFotoCores[midiaId];
    } else {
      nextFotoCores[midiaId] = corNome;
    }
    const novaComposicao = encodeCoresProduto(composicaoLimpa, coresHabilitadas, nextFotoCores);
    const { error } = await supabase
      .from("produtos")
      .update({ composicao: novaComposicao })
      .eq("id", produtoId);
    if (error) {
      toast.error("Erro ao associar cor: " + error.message);
      return;
    }
    toast.success(corNome ? `Foto associada à cor ${corNome}` : "Associação de cor removida");
    qc.invalidateQueries({ queryKey: ["admin", "produto-composicao-midias", produtoId] });
    qc.invalidateQueries({ queryKey: ["admin", "produto", produtoId] });
    invalidateStore(qc);
  }

  const [progress, setProgress] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [yt, setYt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    invalidateStore(qc);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === midias.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(midias.map((m) => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;
  const allSelected = midias.length > 0 && selectedCount === midias.length;

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
          const extMatch = file.name.split(".").pop();
          const ext = (extMatch ? extMatch.toLowerCase().replace(/[^a-z0-9]/g, "") : "") || (file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "png");
          const path = `${produtoId}/${id}.${ext}`;
          const contentType = file.type || (ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png");
          const { error } = await supabase.storage.from("produtos").upload(path, file, { contentType, cacheControl: "31536000" });
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

  async function reordenar(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const draggedItem = midias[fromIdx];
    if (!draggedItem) return;

    let novaLista: typeof midias;

    // Se o item arrastado está entre os selecionados e há mais de 1 selecionado:
    // Move o grupo inteiro de selecionados para a posição de destino mantendo a ordem relativa
    if (selectedIds.has(draggedItem.id) && selectedIds.size > 1) {
      const targetItem = midias[toIdx];
      const selecionados = midias.filter((m) => selectedIds.has(m.id));
      const restantes = midias.filter((m) => !selectedIds.has(m.id));

      let targetRestantesIdx = targetItem ? restantes.findIndex((m) => m.id === targetItem.id) : -1;
      if (targetRestantesIdx === -1) {
        targetRestantesIdx = toIdx > fromIdx ? restantes.length : 0;
      } else if (toIdx > fromIdx) {
        targetRestantesIdx += 1;
      }

      novaLista = [
        ...restantes.slice(0, targetRestantesIdx),
        ...selecionados,
        ...restantes.slice(targetRestantesIdx),
      ];
    } else {
      // Movimentação individual simples
      const list = [...midias];
      const [moved] = list.splice(fromIdx, 1);
      if (!moved) return;
      list.splice(toIdx, 0, moved);
      novaLista = list;
    }

    await Promise.all(
      novaLista.map((m, n) => supabase.from("produto_midias").update({ ordem: n }).eq("id", m.id))
    );
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

  async function moverLote(destino: "inicio" | "fim" | -1 | 1) {
    if (selectedIds.size === 0) return;
    const list = [...midias];
    const selecionados = list.filter((m) => selectedIds.has(m.id));
    const naoSelecionados = list.filter((m) => !selectedIds.has(m.id));

    let novaLista: typeof midias;
    if (destino === "inicio") {
      novaLista = [...selecionados, ...naoSelecionados];
    } else if (destino === "fim") {
      novaLista = [...naoSelecionados, ...selecionados];
    } else if (destino === -1) {
      novaLista = [...list];
      for (let i = 1; i < novaLista.length; i++) {
        const a = novaLista[i]!;
        const b = novaLista[i - 1]!;
        if (selectedIds.has(a.id) && !selectedIds.has(b.id)) {
          novaLista[i] = b;
          novaLista[i - 1] = a;
        }
      }
    } else {
      novaLista = [...list];
      for (let i = novaLista.length - 2; i >= 0; i--) {
        const a = novaLista[i]!;
        const b = novaLista[i + 1]!;
        if (selectedIds.has(a.id) && !selectedIds.has(b.id)) {
          novaLista[i] = b;
          novaLista[i + 1] = a;
        }
      }
    }

    await Promise.all(
      novaLista.map((m, n) => supabase.from("produto_midias").update({ ordem: n }).eq("id", m.id))
    );
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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(m.id);
      return next;
    });
    refresh();
  }

  async function excluirSelecionadas() {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Excluir as ${count} ${count === 1 ? "mídia selecionada" : "mídias selecionadas"}?`)) return;

    const selecionadas = midias.filter((m) => selectedIds.has(m.id));
    const paths = selecionadas.flatMap((m) => [m.url, m.capa_url]).filter(isStoragePath) as string[];

    if (paths.length > 0) {
      await supabase.storage.from("produtos").remove(paths);
    }

    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("produto_midias").delete().in("id", ids);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return;
    }

    const restantes = midias.filter((m) => !selectedIds.has(m.id));
    const novaPrincipal = restantes[0];
    if (novaPrincipal && selecionadas.some((m) => m.principal)) {
      await supabase.from("produto_midias").update({ principal: true }).eq("id", novaPrincipal.id);
    }

    await Promise.all(
      restantes.map((m, idx) => supabase.from("produto_midias").update({ ordem: idx }).eq("id", m.id))
    );

    setSelectedIds(new Set());
    toast.success(`${count} ${count === 1 ? "mídia excluída" : "mídias excluídas"}`);
    refresh();
  }

  return (
    <Panel>
      <h2 className="font-sans text-lg font-bold tracking-normal">Fotos e vídeos</h2>
      <p className="text-sm text-muted-foreground">Fotos são enviadas na qualidade original (PNG, JPEG, etc.). Vídeos até 50 MB, sem som na loja.</p>

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
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="h-8 text-xs gap-1.5"
              >
                <Check className={cn("size-3.5", allSelected ? "opacity-100" : "opacity-40")} />
                {allSelected ? "Desmarcar todas" : "Selecionar todas"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {midias.length} {midias.length === 1 ? "mídia" : "mídias no anúncio"}
              </span>
            </div>

            <p className="text-xs text-muted-foreground hidden sm:block">
              💡 Arraste para reordenar (individual ou em lote)
            </p>
          </div>

          {selectedCount > 0 && (
            <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-card/95 p-3 shadow-md backdrop-blur-md animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-xs">
                  {selectedCount}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  {selectedCount === 1 ? "foto selecionada" : "fotos selecionadas"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moverLote("inicio")}
                  title="Mover fotos selecionadas para o início"
                  className="h-8 text-xs gap-1"
                >
                  <ChevronsLeft className="size-3.5" />
                  <span className="hidden sm:inline">Início</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moverLote(-1)}
                  title="Mover fotos selecionadas 1 posição para a esquerda"
                  className="h-8 text-xs gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  <span className="hidden sm:inline">Esquerda</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moverLote(1)}
                  title="Mover fotos selecionadas 1 posição para a direita"
                  className="h-8 text-xs gap-1"
                >
                  <span className="hidden sm:inline">Direita</span>
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moverLote("fim")}
                  title="Mover fotos selecionadas para o final"
                  className="h-8 text-xs gap-1"
                >
                  <span className="hidden sm:inline">Fim</span>
                  <ChevronsRight className="size-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={excluirSelecionadas}
                  className="h-8 text-xs gap-1 font-semibold"
                >
                  <Trash2 className="size-3.5" />
                  <span>Excluir ({selectedCount})</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5 mr-1" /> Limpar
                </Button>
              </div>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {midias.map((m, i) => {
              const ytId = youtubeId(m.video_externo);
              const thumb = m.tipo === "foto" ? mediaUrl(m.url) : m.capa_url ? mediaUrl(m.capa_url) : ytId ? youtubeThumb(ytId) : "";
              const isSelected = selectedIds.has(m.id);
              const isBeingDragged = draggingIdx === i;
              const isBatchDragged = draggingIdx !== null && selectedIds.has(midias[draggingIdx]?.id ?? "") && isSelected;
              const corAssociada = fotoCores[m.id] || (m.url ? fotoCores[m.url] : "");

              return (
                <li
                  key={m.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverIdx !== i) setDragOverIdx(i);
                  }}
                  onDragLeave={() => {
                    if (dragOverIdx === i) setDragOverIdx(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggingIdx !== null && draggingIdx !== i) {
                      reordenar(draggingIdx, i);
                    }
                    setDraggingIdx(null);
                    setDragOverIdx(null);
                  }}
                  onDragEnd={() => {
                    setDraggingIdx(null);
                    setDragOverIdx(null);
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-background transition-all select-none cursor-grab active:cursor-grabbing",
                    isSelected
                      ? "ring-2 ring-primary border-primary bg-primary/5 shadow-sm"
                      : "hover:border-foreground/30",
                    m.principal && !isSelected && "ring-2 ring-primary/80",
                    (isBeingDragged || isBatchDragged) && "opacity-40 scale-95 border-dashed border-primary",
                    dragOverIdx === i && draggingIdx !== i && "ring-2 ring-primary ring-offset-2 scale-[1.02]"
                  )}
                >
                  {/* Botão de seleção em lote */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(m.id);
                    }}
                    aria-label={isSelected ? "Desmarcar mídia" : "Selecionar mídia"}
                    aria-pressed={isSelected}
                    title={isSelected ? "Desmarcar" : "Selecionar"}
                    className={cn(
                      "absolute left-2 top-2 z-20 flex size-7 items-center justify-center rounded-lg border transition-all shadow-xs",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-background/85 border-border text-transparent hover:border-foreground/60 hover:bg-background"
                    )}
                  >
                    <Check className={cn("size-4 stroke-[3]", isSelected ? "opacity-100 text-white" : "opacity-0")} />
                  </button>

                  <div
                    onClick={() => toggleSelect(m.id)}
                    className="relative aspect-[4/5] bg-muted cursor-pointer"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover pointer-events-none" />
                    ) : (
                      <video src={mediaUrl(m.url)} preload="metadata" muted className="h-full w-full object-cover pointer-events-none" />
                    )}
                    <span className="absolute left-2 bottom-2 z-10 flex items-center justify-center rounded-md bg-background/80 p-1 text-muted-foreground shadow-xs backdrop-blur-xs">
                      <GripVertical className="size-4" />
                    </span>
                    {m.tipo === "video" && (
                      <span className="absolute left-11 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-semibold">
                        <Play className="size-3" /> {ytId ? "YouTube" : "Vídeo"}
                      </span>
                    )}
                    {m.principal && (
                      <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow-xs">
                        Principal
                      </span>
                    )}
                    {corAssociada && (
                      <span className="absolute left-2 top-11 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2 py-0.5 text-[11px] font-bold text-foreground shadow-xs border border-border/60 backdrop-blur-xs">
                        <span
                          className="size-2 rounded-full border border-black/20"
                          style={{ backgroundColor: getCorDef(corAssociada).hex }}
                        />
                        Cor: {corAssociada}
                      </span>
                    )}
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
                  {m.tipo === "foto" && (
                    <div className="border-t border-border/60 bg-muted/20 p-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>Associar cor:</span>
                        {corAssociada && (
                          <span
                            className="size-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: getCorDef(corAssociada).hex }}
                          />
                        )}
                      </div>
                      <select
                        value={corAssociada || ""}
                        onChange={(e) => associarCorFoto(m.id, e.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        aria-label={`Associar cor à foto ${i + 1}`}
                      >
                        <option value="">(Nenhuma cor associada)</option>
                        {coresHabilitadas.map((nome) => (
                          <option key={nome} value={nome}>
                            {nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}
