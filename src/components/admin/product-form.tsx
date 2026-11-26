import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FieldLabel, Panel, invalidateStore, selectClass } from "./ui";
import { AiDescriberModal } from "./ai-describer-modal";
import { obterDescricaoOficialProduto } from "@/lib/product-ai-describer";
import { FAIXAS } from "@/lib/pricing";
import { money, slugify } from "@/lib/format";
import { CORES_PADRAO, decodeCoresProduto, encodeCoresProduto, getCorContrasteClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

export type ProdutoEdit = Tables<"produtos"> & { faixas_preco: { quantidade_minima: number; preco_peca: number }[] };

export function parsePreco(v: string): number | null {
  const s = v.trim().replace(/\s|R\$/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function useCategoriasAdmin() {
  return useQuery({
    queryKey: ["admin", "categorias-lista"],
    queryFn: async () => {
      const { data } = await supabase.from("categorias").select("id, nome, slug").order("ordem");
      return data ?? [];
    },
  });
}

export function ProductForm({ produto }: { produto?: ProdutoEdit }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cats } = useCategoriasAdmin();
  const decodedCores = decodeCoresProduto(produto?.composicao);
  const [composicaoTexto, setComposicaoTexto] = useState(decodedCores.composicaoLimpa);
  const [coresHabilitadas, setCoresHabilitadas] = useState<string[]>(decodedCores.coresHabilitadas);
  const [f, setF] = useState({
    nome: produto?.nome ?? "",
    codigo_modelo: produto?.codigo_modelo ?? "",
    slug: produto?.slug ?? "",
    categoria_id: produto?.categoria_id ?? "",
    descricao: produto ? obterDescricaoOficialProduto(produto) : "",
    estoque: String(produto?.estoque ?? 1000),
    ordem: String(produto?.ordem ?? 0),
    ativo: produto?.ativo ?? true,
    destaque: produto?.destaque ?? false,
  });
  const [slugTouched, setSlugTouched] = useState(!!produto);
  const [precos, setPrecos] = useState<Record<number, string>>(() =>
    Object.fromEntries(FAIXAS.map((q) => {
      const v = produto?.faixas_preco.find((x) => x.quantidade_minima === q)?.preco_peca;
      return [q, v !== undefined ? money(Number(v)) : ""];
    })),
  );
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((c) => ({ ...c, [k]: v }));

  function toggleCor(nome: string) {
    setCoresHabilitadas((prev) =>
      prev.includes(nome) ? prev.filter((c) => c !== nome) : [...prev, nome],
    );
  }

  function selecionarTodasCores() {
    setCoresHabilitadas(CORES_PADRAO.map((c) => c.nome));
  }

  function desmarcarTodasCores() {
    setCoresHabilitadas([]);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const nome = f.nome.trim();
    const codigo = f.codigo_modelo.trim();
    const slug = slugify(f.slug || nome);
    if (!nome || !codigo) { toast.error("Preencha o nome e o código do modelo."); return; }
    const faixas: { quantidade_minima: number; preco_peca: number }[] = [];
    for (const q of FAIXAS) {
      const v = parsePreco(precos[q] ?? "");
      if (precos[q]?.trim() && v === null) { toast.error(`Preço inválido na faixa de ${q} peças.`); return; }
      if (v !== null) faixas.push({ quantidade_minima: q, preco_peca: v });
    }
    if (!faixas.length) { toast.error("Informe ao menos um preço por peça."); return; }
    setSaving(true);
    const composicaoSalva = encodeCoresProduto(composicaoTexto, coresHabilitadas, decodedCores.fotoCores);
    const payload = {
      nome,
      codigo_modelo: codigo,
      slug,
      categoria_id: f.categoria_id || null,
      descricao: f.descricao,
      composicao: composicaoSalva,
      estoque: Math.max(0, parseInt(f.estoque, 10) || 0),
      ordem: parseInt(f.ordem, 10) || 0,
      ativo: f.ativo,
      destaque: f.destaque,
    };
    const res = produto
      ? await supabase.from("produtos").update(payload).eq("id", produto.id).select("id").single()
      : await supabase.from("produtos").insert(payload).select("id").single();
    if (res.error) {
      setSaving(false);
      { toast.error(res.error.code === "23505" ? "Código do modelo ou slug já usado por outro produto." : res.error.message); return; }
    }
    const id = res.data.id;
    const definidas = faixas.map((x) => x.quantidade_minima);
    const { error: e1 } = await supabase.from("faixas_preco").upsert(faixas.map((x) => ({ ...x, produto_id: id })), { onConflict: "produto_id,quantidade_minima" });
    const apagar = FAIXAS.filter((q) => !definidas.includes(q));
    if (apagar.length) await supabase.from("faixas_preco").delete().eq("produto_id", id).in("quantidade_minima", apagar);
    setSaving(false);
    if (e1) { toast.error(e1.message); return; }
    toast.success("Produto salvo");
    qc.invalidateQueries({ queryKey: ["admin"] });
    invalidateStore(qc);
    if (!produto) navigate({ to: "/admin/produtos/$id", params: { id } });
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <Panel className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="p-nome">Nome</FieldLabel>
          <Input
            id="p-nome"
            value={f.nome}
            onChange={(e) => {
              set("nome", e.target.value);
              set("slug", slugify(e.target.value));
            }}
          />
        </div>
        <div>
          <FieldLabel htmlFor="p-codigo">Código do modelo</FieldLabel>
          <Input id="p-codigo" autoCapitalize="characters" value={f.codigo_modelo} onChange={(e) => set("codigo_modelo", e.target.value)} />
        </div>
        <div>
          <FieldLabel htmlFor="p-cat">Categoria</FieldLabel>
          <select id="p-cat" className={selectClass} value={f.categoria_id} onChange={(e) => set("categoria_id", e.target.value)}>
            <option value="">Sem categoria</option>
            {cats?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="p-estoque">Estoque (peças)</FieldLabel>
            <Input id="p-estoque" inputMode="numeric" value={f.estoque} onChange={(e) => set("estoque", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <FieldLabel htmlFor="p-ordem">Ordem</FieldLabel>
            <Input id="p-ordem" inputMode="numeric" value={f.ordem} onChange={(e) => set("ordem", e.target.value.replace(/[^\d-]/g, ""))} />
          </div>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor="p-desc">Descrição</FieldLabel>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  f.descricao.length > 750
                    ? "bg-destructive/15 text-destructive font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {f.descricao.length}/750 carac.
              </span>
            </div>
            <AiDescriberModal
              nomeProduto={f.nome}
              codigoModelo={f.codigo_modelo}
              descricaoAtual={f.descricao}
              onAplicar={(novaDesc) => set("descricao", novaDesc)}
            />
          </div>
          <Textarea id="p-desc" rows={6} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex min-h-11 items-center gap-3">
            <Switch checked={f.ativo} onCheckedChange={(v) => set("ativo", v)} /> Ativo na loja
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <Switch checked={f.destaque} onCheckedChange={(v) => set("destaque", v)} /> Destaque
          </label>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-sans text-lg font-bold tracking-normal">Cores disponíveis neste anúncio</h2>
            <p className="text-sm text-muted-foreground">
              Selecione as cores que o cliente poderá escolher na página deste produto.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selecionarTodasCores}>
              Selecionar todas ({CORES_PADRAO.length})
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={desmarcarTodasCores}>
              Desmarcar todas
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {CORES_PADRAO.map((c) => {
            const ativa = coresHabilitadas.includes(c.nome);
            return (
              <button
                key={c.nome}
                type="button"
                onClick={() => toggleCor(c.nome)}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm font-medium transition",
                  ativa
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-input bg-card text-muted-foreground opacity-60 hover:opacity-100",
                )}
              >
                <span
                  className={cn("size-6 shrink-0 rounded-full", getCorContrasteClasses(c.hex))}
                  style={{ backgroundColor: c.hex }}
                />
                <span className="truncate">{c.nome}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {coresHabilitadas.length} de {CORES_PADRAO.length} cores ativas neste anúncio.
        </p>
      </Panel>

      <Panel>
        <h2 className="font-sans text-lg font-bold tracking-normal">Preço por peça</h2>
        <p className="text-sm text-muted-foreground">Pelo total de peças do pedido.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FAIXAS.map((q) => (
            <div key={q}>
              <FieldLabel htmlFor={`p-f${q}`}>A partir de {q}</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                <Input id={`p-f${q}`} inputMode="decimal" className="pl-11" value={precos[q] ?? ""} onChange={(e) => setPrecos((p) => ({ ...p, [q]: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Save />} {produto ? "Salvar produto" : "Criar produto"}
      </Button>
    </form>
  );
}
