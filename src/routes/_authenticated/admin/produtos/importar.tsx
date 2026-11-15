import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FolderCheck, FolderPlus, FolderUp, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, FieldLabel, Panel, invalidateStore, selectClass } from "@/components/admin/ui";
import { useCategoriasAdmin } from "@/components/admin/product-form";
import { resizeToWebp, videoPoster } from "@/lib/image-resize";
import { slugify } from "@/lib/format";
import {
  FAIXAS_PADRAO,
  agruparArquivos,
  caminhoCapa,
  caminhoFoto,
  caminhoVideo,
  codigoModelo,
  encontrarCategoriaCorrespondente,
  extrairPastaRaiz,
  nomeDaCategoria,
  tituloDaPasta,
  type Arquivo,
  type Grupo,
} from "@/lib/bulk-import";
import {
  COMPOSICAO_COTTON_PIMA,
  DESCRICAO_COMPLETA_COTTON_PIMA,
  DESCRICAO_COMPLETA_POLO,
} from "@/lib/pima-defaults";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/produtos/importar")({ component: Importar });

const MAX_VIDEO = 50 * 1024 * 1024;

type Existente = { id: string; codigo_modelo: string; slug: string; nome: string; urls: Set<string> };
type Status = { estado: "aguardando" | "enviando" | "ok" | "erro"; feitos: number; total: number; msg?: string };

/* ---------- reading a dropped folder ---------- */
type FsEntry = { isFile: boolean; isDirectory: boolean; fullPath: string; file?: (cb: (f: File) => void, err: (e: unknown) => void) => void; createReader?: () => { readEntries: (cb: (e: FsEntry[]) => void, err: (e: unknown) => void) => void } };

async function lerEntrada(entry: FsEntry, out: Arquivo[]) {
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((res, rej) => entry.file!(res, rej));
    out.push({ path: entry.fullPath.replace(/^\//, ""), file });
  } else if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    for (;;) {
      const lote = await new Promise<FsEntry[]>((res, rej) => reader.readEntries(res, rej));
      if (!lote.length) break;
      for (const e of lote) await lerEntrada(e, out);
    }
  }
}

async function poolMap<T>(items: T[], n: number, fn: (t: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i]!, i);
      }
    }),
  );
}

const preco = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

function Importar() {
  const qc = useQueryClient();
  const { data: cats } = useCategoriasAdmin();
  const dirRef = useRef<HTMLInputElement>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [titulos, setTitulos] = useState<Record<string, string>>({});
  const [existentes, setExistentes] = useState<Map<string, Existente>>(new Map());

  type ModoCategoria = "auto" | "existente" | "nova";
  const [modoCategoria, setModoCategoria] = useState<ModoCategoria>("auto");
  const [pastaRaiz, setPastaRaiz] = useState<string | null>(null);
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState("");
  const [slugNovaCategoria, setSlugNovaCategoria] = useState("");

  const [categoria, setCategoria] = useState("");
  const [prefixo, setPrefixo] = useState("PIMA");
  const [inicio, setInicio] = useState(1);
  const [nomeModelo, setNomeModelo] = useState("Camiseta Pima");
  const [composicao, setComposicao] = useState(COMPOSICAO_COTTON_PIMA);
  const [descricao, setDescricao] = useState(DESCRICAO_COMPLETA_COTTON_PIMA);
  const [precos, setPrecos] = useState<string[]>(["", "", "", ""]);
  const [publicar, setPublicar] = useState(false);
  const [drag, setDrag] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [erros, setErros] = useState<string[]>([]);

  // Pick sensible defaults when the category changes.
  useEffect(() => {
    let catNome = "";
    if (modoCategoria === "nova" || categoria === "nova") {
      catNome = nomeNovaCategoria || (pastaRaiz ? nomeDaCategoria(pastaRaiz) : "");
    } else {
      const c = cats?.find((x) => x.id === categoria);
      catNome = c?.nome ?? "";
    }
    if (!catNome) return;
    if (/polo/i.test(catNome)) {
      setPrefixo("POLO");
      setNomeModelo("Camisa Polo");
      setComposicao("");
      setDescricao(DESCRICAO_COMPLETA_POLO);
    } else if (/pima/i.test(catNome)) {
      setPrefixo("PIMA");
      setNomeModelo("Camiseta Pima");
      setComposicao(COMPOSICAO_COTTON_PIMA);
      setDescricao(DESCRICAO_COMPLETA_COTTON_PIMA);
    } else {
      const p = slugify(catNome).replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
      setPrefixo(p || "MOD");
      setNomeModelo(nomeDaCategoria(catNome));
    }
  }, [categoria, cats, modoCategoria, nomeNovaCategoria, pastaRaiz]);

  useEffect(() => {
    if (!categoria && cats?.length && modoCategoria === "existente") {
      setCategoria(cats[0]!.id);
    }
  }, [cats, categoria, modoCategoria]);

  useEffect(() => {
    if (!rodando) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [rodando]);

  async function carregarExistentes() {
    const { data, error } = await supabase.from("produtos").select("id, codigo_modelo, slug, nome, produto_midias(url)");
    if (error) throw error;
    const m = new Map<string, Existente>();
    for (const p of data) m.set(p.codigo_modelo, { id: p.id, codigo_modelo: p.codigo_modelo, slug: p.slug, nome: p.nome, urls: new Set(p.produto_midias.map((x) => x.url).filter(Boolean) as string[]) });
    setExistentes(m);
    return m;
  }

  async function receber(arquivos: Arquivo[]) {
    const g = agruparArquivos(arquivos);
    if (!g.length) {
      toast.error("Nenhuma foto ou vídeo encontrado nessa pasta.");
      return;
    }
    const raiz = extrairPastaRaiz(arquivos);
    setPastaRaiz(raiz);

    if (raiz) {
      const nomeSugestao = nomeDaCategoria(raiz);
      const match = encontrarCategoriaCorrespondente(raiz, cats ?? []);
      if (match) {
        if (modoCategoria === "auto") {
          setCategoria(match.id);
          toast.info(`Pasta vinculada à categoria: "${match.nome}"`);
        }
      } else {
        setNomeNovaCategoria(nomeSugestao);
        setSlugNovaCategoria(slugify(nomeSugestao));
        if (modoCategoria === "auto") {
          setCategoria("nova");
          toast.info(`Pasta criará a nova categoria: "${nomeSugestao}"`);
        }
      }
    }

    setGrupos(g);
    setTitulos({});
    setStatus({});
    setErros([]);
    try {
      await carregarExistentes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ler produtos");
    }
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    setLendo(true);
    try {
      const out: Arquivo[] = [];
      const entries = Array.from(e.dataTransfer.items)
        .map((it) => (it as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.())
        .filter(Boolean) as FsEntry[];
      for (const en of entries) await lerEntrada(en, out);
      await receber(out);
    } finally {
      setLendo(false);
    }
  }

  const plano = useMemo(
    () =>
      grupos.map((g, i) => {
        const n = inicio + i;
        const codigo = codigoModelo(prefixo, n);
        const auto = tituloDaPasta(g.pasta, n, nomeModelo);
        const titulo = titulos[g.pasta] ?? auto.titulo;
        return { g, n, codigo, titulo, trocado: auto.trocado && titulos[g.pasta] === undefined, existente: existentes.get(codigo) };
      }),
    [grupos, inicio, prefixo, nomeModelo, titulos, existentes],
  );

  const totalArquivos = plano.reduce((s, p) => s + p.g.fotos.length + p.g.videos.length, 0);
  const feitos = Object.values(status).reduce((s, x) => s + x.feitos, 0);
  const valoresPreco = precos.map(preco);
  const temPrecos = valoresPreco.every((v) => v > 0);

  async function importar() {
    let catIdFinal = categoria;
    const precisaCriar = modoCategoria === "nova" || categoria === "nova" || (modoCategoria === "auto" && (!catIdFinal || catIdFinal === "nova"));

    if (precisaCriar) {
      const nomeCat = (nomeNovaCategoria || (pastaRaiz ? nomeDaCategoria(pastaRaiz) : "")).trim();
      if (!nomeCat) {
        toast.error("Informe o nome da categoria para onde os produtos serão importados.");
        return;
      }
      const slugCat = slugify(slugNovaCategoria || nomeCat);

      // Procura primeiro se já existe com esse slug ou nome
      const { data: catExiste } = await supabase
        .from("categorias")
        .select("id, nome")
        .or(`slug.eq.${slugCat},nome.ilike.${nomeCat}`)
        .maybeSingle();

      if (catExiste) {
        catIdFinal = catExiste.id;
      } else {
        const totalCats = cats?.length ?? 0;
        const { data: novaCat, error: catErr } = await supabase
          .from("categorias")
          .insert({
            nome: nomeCat,
            slug: slugCat,
            descricao: `Produtos da categoria ${nomeCat}`,
            ativa: true,
            ordem: totalCats + 1,
          })
          .select("id, nome")
          .single();

        if (catErr) {
          toast.error(`Não foi possível criar a categoria "${nomeCat}": ${catErr.message}`);
          return;
        }
        catIdFinal = novaCat.id;
        toast.success(`Categoria "${novaCat.nome}" criada com sucesso!`);
      }
    } else if (!catIdFinal) {
      toast.error("Escolha a categoria para os produtos.");
      return;
    }

    setRodando(true);
    setErros([]);
    const log = (m: string) => setErros((e) => [...e, m]);
    let criados = 0;
    let enviados = 0;
    try {
      const mapa = await carregarExistentes();
      const slugs = new Set([...mapa.values()].map((p) => p.slug));
      for (const p of plano) {
        const total = p.g.fotos.length + p.g.videos.length;
        const set = (s: Partial<Status>) => setStatus((st) => ({ ...st, [p.codigo]: { estado: "enviando", feitos: 0, total, ...st[p.codigo], ...s } }));
        set({ estado: "enviando", feitos: 0 });
        try {
          let prod = mapa.get(p.codigo);
          if (!prod) {
            let slug = slugify(p.titulo) || slugify(p.codigo);
            if (slugs.has(slug)) slug = `${slug}-${slugify(p.codigo)}`;
            const { data, error } = await supabase
              .from("produtos")
              .insert({ nome: p.titulo, codigo_modelo: p.codigo, slug, descricao: `${p.titulo}. ${descricao}`.trim(), composicao, categoria_id: catIdFinal, ativo: false, destaque: false, ordem: p.n, estoque: 0 })
              .select("id")
              .single();
            if (error) throw error;
            slugs.add(slug);
            const { error: fe } = await supabase
              .from("faixas_preco")
              .insert(FAIXAS_PADRAO.map((q, i) => ({ produto_id: data.id, quantidade_minima: q, preco_peca: valoresPreco[i] ?? 0 })));
            if (fe) log(`${p.codigo}: preços não gravados (${fe.message})`);
            prod = { id: data.id, codigo_modelo: p.codigo, slug, nome: p.titulo, urls: new Set() };
            mapa.set(p.codigo, prod);
            criados++;
          }
          const atual = prod;
          let ok = 0;
          const midias: { tipo: "foto" | "video"; url: string; capa_url: string | null; ordem: number; principal: boolean }[] = [];

          await poolMap(p.g.fotos, 3, async (a, i) => {
            const url = caminhoFoto(p.codigo, i + 1);
            try {
              if (!atual.urls.has(url)) {
                const blob = await resizeToWebp(a.file, 1600, 0.8);
                const { error } = await supabase.storage.from("produtos").upload(url, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
                if (error) throw error;
                midias.push({ tipo: "foto", url, capa_url: null, ordem: i, principal: i === 0 });
              }
            } catch (err) {
              log(`${p.codigo} · ${a.file.name}: ${err instanceof Error ? err.message : "não foi possível converter"}`);
            }
            ok++;
            set({ feitos: ok });
          });

          for (const [i, a] of p.g.videos.entries()) {
            const url = caminhoVideo(p.codigo, i + 1, a.file.name);
            try {
              if (!atual.urls.has(url)) {
                if (a.file.size > MAX_VIDEO) throw new Error("vídeo maior que 50 MB, não enviado");
                const tipo = a.file.type || (url.endsWith(".mov") ? "video/quicktime" : "video/mp4");
                const { error } = await supabase.storage.from("produtos").upload(url, a.file, { contentType: tipo, cacheControl: "31536000", upsert: true });
                if (error) throw error;
                let capa: string | null = null;
                const poster = await videoPoster(a.file);
                if (poster) {
                  const cp = caminhoCapa(p.codigo, i + 1);
                  const { error: pe } = await supabase.storage.from("produtos").upload(cp, poster, { contentType: "image/webp", upsert: true });
                  if (!pe) capa = cp;
                }
                midias.push({ tipo: "video", url, capa_url: capa, ordem: p.g.fotos.length + i, principal: false });
              }
            } catch (err) {
              log(`${p.codigo} · ${a.file.name}: ${err instanceof Error ? err.message : "falha no envio"}`);
            }
            ok++;
            set({ feitos: ok });
          }

          if (midias.length) {
            const jaTemPrincipal = atual.urls.size > 0;
            const linhas = midias
              .sort((a, b) => a.ordem - b.ordem)
              .map((m) => ({ ...m, produto_id: atual.id, principal: m.principal && !jaTemPrincipal }));
            const { error } = await supabase.from("produto_midias").insert(linhas);
            if (error) throw error;
            linhas.forEach((m) => atual.urls.add(m.url));
            enviados += linhas.length;
          }
          if (publicar && temPrecos) await supabase.from("produtos").update({ ativo: true }).eq("id", atual.id);
          set({ estado: "ok" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "falha";
          log(`${p.codigo}: ${msg}`);
          set({ estado: "erro", msg });
        }
      }
      toast.success(`Importação concluída: ${criados} produtos novos, ${enviados} arquivos enviados.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na importação");
    } finally {
      setRodando(false);
      qc.invalidateQueries({ queryKey: ["admin", "categorias"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
      invalidateStore(qc);
    }
  }

  const terminou = !rodando && plano.length > 0 && plano.every((p) => status[p.codigo]?.estado === "ok" || status[p.codigo]?.estado === "erro");

  return (
    <AdminPage
      title="Importar pasta"
      description="Cada subpasta vira um produto, com as fotos e vídeos dela."
      actions={
        <Button asChild variant="outline">
          <Link to="/admin/produtos">
            <ArrowLeft /> Produtos
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4">
        {/* Painel de escolha e configuração do destino (Categoria) */}
        <Panel>
          <div className="space-y-4">
            <div>
              <h2 className="font-sans text-base sm:text-lg font-bold tracking-normal">
                Destino da importação (Categoria)
              </h2>
              <p className="text-sm text-muted-foreground">
                Importe direto para uma categoria existente ou deixe a pasta virar uma categoria automaticamente.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setModoCategoria("auto")}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition",
                  modoCategoria === "auto"
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "hover:bg-muted/50 border-input"
                )}
              >
                <span className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                  📁 Automático pela pasta
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  A pasta principal vira a categoria (cria automaticamente se não existir ou vincula à existente).
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoCategoria("existente");
                  if ((!categoria || categoria === "nova") && cats?.length) {
                    setCategoria(cats[0]!.id);
                  }
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition",
                  modoCategoria === "existente"
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "hover:bg-muted/50 border-input"
                )}
              >
                <span className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                  🏷️ Categoria existente
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Importar todos os produtos diretamente para uma categoria já existente no site.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoCategoria("nova");
                  setCategoria("nova");
                }}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition",
                  modoCategoria === "nova"
                    ? "border-primary bg-primary/10 ring-2 ring-primary"
                    : "hover:bg-muted/50 border-input"
                )}
              >
                <span className="font-semibold text-sm flex items-center gap-1.5 text-foreground">
                  ✨ Criar nova categoria
                </span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Defina agora o nome da nova categoria para receber os produtos importados.
                </span>
              </button>
            </div>

            {/* Detalhes do modo selecionado */}
            {modoCategoria === "auto" && (
              <div className="rounded-xl border bg-muted/40 p-3.5 text-sm space-y-2.5">
                {pastaRaiz ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Pasta principal identificada
                        </span>
                        <p className="text-base font-bold text-foreground flex items-center gap-2">
                          📁 {pastaRaiz}
                        </p>
                      </div>

                      {categoria && categoria !== "nova" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold text-xs px-3 py-1">
                          <CheckCircle2 className="size-3.5" /> Vinculada à categoria existente: {cats?.find((c) => c.id === categoria)?.nome}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold text-xs px-3 py-1">
                          <Sparkles className="size-3.5" /> Criará a nova categoria no site
                        </span>
                      )}
                    </div>

                    {(categoria === "nova" || !categoria) && (
                      <div className="pt-2 border-t border-border/60 max-w-md">
                        <FieldLabel htmlFor="auto-cat-nome">Nome da nova categoria</FieldLabel>
                        <Input
                          id="auto-cat-nome"
                          value={nomeNovaCategoria}
                          disabled={rodando}
                          onChange={(e) => {
                            setNomeNovaCategoria(e.target.value);
                            setSlugNovaCategoria(slugify(e.target.value));
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    💡 <strong>Como funciona:</strong> Ao arrastar ou escolher uma pasta (ex.: <code>COTTON PIMA</code>), o nome dela será usado como categoria. Se a categoria já existir no site, os produtos serão adicionados a ela; se não existir, o sistema criará a categoria automaticamente!
                  </p>
                )}
              </div>
            )}

            {modoCategoria === "existente" && (
              <div className="rounded-xl border bg-muted/40 p-3.5 space-y-2 max-w-md">
                <FieldLabel htmlFor="cat-direta">Selecione a categoria de destino:</FieldLabel>
                <select
                  id="cat-direta"
                  className={selectClass}
                  value={categoria}
                  disabled={rodando}
                  onChange={(e) => setCategoria(e.target.value)}
                >
                  <option value="">Selecione uma categoria...</option>
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Todos os produtos importados irão diretamente para a categoria selecionada acima.
                </p>
              </div>
            )}

            {modoCategoria === "nova" && (
              <div className="rounded-xl border bg-muted/40 p-3.5 space-y-3 max-w-md">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dados da nova categoria
                </p>
                <div>
                  <FieldLabel htmlFor="cat-nova-nome">Nome da nova categoria</FieldLabel>
                  <Input
                    id="cat-nova-nome"
                    placeholder="Ex.: Camisas Polo Piquet, Bermudas"
                    value={nomeNovaCategoria}
                    disabled={rodando}
                    onChange={(e) => {
                      setNomeNovaCategoria(e.target.value);
                      setSlugNovaCategoria(slugify(e.target.value));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn("rounded-2xl border-2 border-dashed p-6 text-center transition", drag ? "border-primary bg-accent" : "border-input")}
          >
            {lendo ? (
              <p className="flex items-center justify-center gap-2 font-medium">
                <Loader2 className="size-5 animate-spin" /> Lendo arquivos...
              </p>
            ) : (
              <>
                <FolderUp className="mx-auto size-10 text-primary" />
                <p className="mt-2 font-medium">
                  {modoCategoria === "auto"
                    ? "Arraste aqui a pasta principal (ex.: COTTON PIMA)"
                    : modoCategoria === "existente"
                      ? `Arraste a pasta de produtos para importar em "${cats?.find((c) => c.id === categoria)?.nome || "Categoria"}"`
                      : `Arraste a pasta de produtos para a categoria "${nomeNovaCategoria || "Nova categoria"}"`}
                </p>
                <p className="text-sm text-muted-foreground">Fotos são reduzidas para 1600 px em WebP. Vídeos até 50 MB são enviados como estão.</p>
                <Button className="mt-4" variant="outline" disabled={rodando} onClick={() => dirRef.current?.click()}>
                  Escolher pasta
                </Button>
                <p className="mt-3 text-sm text-muted-foreground">Use um computador: celulares não permitem escolher pastas.</p>
              </>
            )}
            <input
              ref={dirRef}
              type="file"
              multiple
              hidden
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                receber(files.map((file) => ({ path: file.webkitRelativePath || file.name, file })));
                e.target.value = "";
              }}
            />
          </div>
        </Panel>

        {plano.length > 0 && (
          <>
            <Panel>
              <h2 className="font-sans text-lg font-bold tracking-normal">Configuração</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="imp-cat">Categoria de destino</FieldLabel>
                  <select
                    id="imp-cat"
                    className={selectClass}
                    value={categoria}
                    disabled={rodando}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCategoria(v);
                      if (v === "nova") setModoCategoria("nova");
                      else setModoCategoria("existente");
                    }}
                  >
                    {(modoCategoria === "nova" || categoria === "nova" || pastaRaiz) && (
                      <option value="nova">
                        ✨ Nova categoria: "{nomeNovaCategoria || (pastaRaiz ? nomeDaCategoria(pastaRaiz) : "Nova")}"
                      </option>
                    )}
                    {cats?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor="imp-pre">Prefixo do código</FieldLabel>
                    <Input id="imp-pre" value={prefixo} disabled={rodando} onChange={(e) => setPrefixo(e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="imp-ini">Começar em</FieldLabel>
                    <Input id="imp-ini" type="number" min={1} value={inicio} disabled={rodando} onChange={(e) => setInicio(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor="imp-nome" hint="(para pastas com nome de marca)">Nome genérico</FieldLabel>
                  <Input id="imp-nome" value={nomeModelo} disabled={rodando} onChange={(e) => setNomeModelo(e.target.value)} />
                </div>
                <div>
                  <FieldLabel htmlFor="imp-comp">Composição</FieldLabel>
                  <Input id="imp-comp" value={composicao} disabled={rodando} onChange={(e) => setComposicao(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="imp-desc" hint="(vem depois do nome do produto)">Descrição</FieldLabel>
                  <Textarea id="imp-desc" value={descricao} disabled={rodando} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-1.5 font-medium">
                    Preço por peça <span className="font-normal text-muted-foreground">(opcional, igual para todos)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {FAIXAS_PADRAO.map((q, i) => (
                      <div key={q}>
                        <label htmlFor={`imp-p${q}`} className="mb-1 block text-sm text-muted-foreground">
                          {q}+ peças (R$)
                        </label>
                        <Input
                          id={`imp-p${q}`}
                          inputMode="decimal"
                          placeholder="0,00"
                          value={precos[i]}
                          disabled={rodando}
                          onChange={(e) => setPrecos((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                        />
                      </div>
                    ))}
                  </div>
                  <label className={cn("mt-3 flex min-h-11 items-center gap-3", !temPrecos && "opacity-60")}>
                    <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={publicar && temPrecos} disabled={!temPrecos || rodando} onChange={(e) => setPublicar(e.target.checked)} />
                    Mostrar na loja ao terminar
                  </label>
                  {!temPrecos && <p className="text-sm text-muted-foreground">Sem os 4 preços, os produtos entram ocultos. Depois é só ajustar em Edição rápida e mostrar na loja.</p>}
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-sans text-lg font-bold tracking-normal">
                  {plano.length} produtos · {totalArquivos} arquivos
                </h2>
                <Button onClick={importar} disabled={rodando || !categoria} className="min-w-40">
                  {rodando ? (
                    <>
                      <Loader2 className="animate-spin" /> Importando...
                    </>
                  ) : terminou ? (
                    "Importar de novo (só o que falta)"
                  ) : (
                    "Importar tudo"
                  )}
                </Button>
              </div>
              {(rodando || feitos > 0) && (
                <div className="mt-3">
                  <Progress value={totalArquivos ? (feitos / totalArquivos) * 100 : 0} />
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feitos} de {totalArquivos} arquivos{rodando && " · não feche esta aba"}
                  </p>
                </div>
              )}
              <ul className="mt-4 divide-y">
                {plano.map((p) => {
                  const st = status[p.codigo];
                  return (
                    <li key={p.g.pasta} className="grid gap-2 py-3 sm:grid-cols-[6rem_1fr_auto] sm:items-center">
                      <span className="font-mono text-sm font-semibold">{p.codigo}</span>
                      <div className="min-w-0">
                        <Input
                          aria-label={`Nome do produto ${p.codigo}`}
                          value={p.titulo}
                          disabled={rodando || !!p.existente}
                          onChange={(e) => setTitulos((t) => ({ ...t, [p.g.pasta]: e.target.value }))}
                        />
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          Pasta: {p.g.pasta} · {p.g.fotos.length} fotos{p.g.videos.length > 0 && ` · ${p.g.videos.length} vídeos`}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs font-semibold">
                          {p.trocado && <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Nome de marca trocado</span>}
                          {p.g.fotos.length < 10 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                              <AlertTriangle className="size-3" /> menos de 10 fotos
                            </span>
                          )}
                          {p.existente && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Já existe ({p.existente.nome}): só completa o que falta</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm sm:justify-end">
                        {st?.estado === "enviando" && (
                          <>
                            <Loader2 className="size-4 animate-spin" /> {st.feitos}/{st.total}
                          </>
                        )}
                        {st?.estado === "ok" && <CheckCircle2 className="size-5 text-primary" aria-label="Concluído" />}
                        {st?.estado === "erro" && <XCircle className="size-5 text-destructive" aria-label={st.msg} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            {erros.length > 0 && (
              <Panel>
                <h2 className="font-sans text-lg font-bold tracking-normal text-destructive">Avisos ({erros.length})</h2>
                <ul className="mt-2 max-h-72 space-y-1 overflow-auto text-sm">
                  {erros.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </div>
    </AdminPage>
  );
}
