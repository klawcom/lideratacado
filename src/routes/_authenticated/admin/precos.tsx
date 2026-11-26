import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  CheckCheck,
  CheckSquare,
  Flame,
  ImagePlus,
  Loader2,
  Package,
  Percent,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Tag,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, invalidateStore } from "@/components/admin/ui";
import { parsePreco } from "@/components/admin/product-form";
import { FAIXAS } from "@/lib/pricing";
import { money } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { resizeToWebp } from "@/lib/image-resize";
import seloBlackFridayImg from "@/assets/selo-black-friday.webp";

export const Route = createFileRoute("/_authenticated/admin/precos")({ component: Precos });

type Row = {
  id: string;
  nome: string;
  codigo: string;
  estoque: string;
  categoriaId: string | null;
  categoriaNome: string;
  precos: Record<number, string>;
};

const cellBase =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const cell = `${cellBase} text-right tabular-nums`;
const nameCell = `${cellBase} font-semibold`;

function Precos() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "precos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select(
          "id, nome, codigo_modelo, estoque, categoria_id, ordem, categorias(id, nome, ordem), faixas_preco(quantidade_minima, preco_peca)"
        )
        .order("ordem");
      if (error) throw error;
      return [...data].sort(
        (a, b) => (a.categorias?.ordem ?? 99) - (b.categorias?.ordem ?? 99) || a.ordem - b.ordem
      );
    },
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["admin", "categorias-lista"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id, nome, ordem").order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: configData } = useQuery({
    queryKey: ["admin", "config-precos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracoes").select("id, menu_links").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [orig, setOrig] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Seleção de produtos para ações em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Desconto Promocional em Lote
  const [tipoDesconto, setTipoDesconto] = useState<"porcentagem" | "fixo">("porcentagem");
  const [valorDesconto, setValorDesconto] = useState<string>("10");
  const [alvoDesconto, setAlvoDesconto] = useState<"todos" | "selecionados" | "categoria">("todos");
  const [descontoCatId, setDescontoCatId] = useState<string>("");
  const [aplicandoDesconto, setAplicandoDesconto] = useState(false);

  // Configurações do Selo Promocional
  const [seloAtivo, setSeloAtivo] = useState<boolean>(true);
  const [seloUrl, setSeloUrl] = useState<string | null>(null);
  const [alvoSelo, setAlvoSelo] = useState<"todos" | "selecionados">("todos");
  const [uploadingSelo, setUploadingSelo] = useState(false);
  const [salvandoSelo, setSalvandoSelo] = useState(false);
  const seloInputRef = useRef<HTMLInputElement>(null);

  // Preço por categoria em lote
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [catPrecos, setCatPrecos] = useState<Record<number, string>>({ 10: "", 20: "", 30: "", 50: "" });
  const [aplicandoLote, setAplicandoLote] = useState(false);

  // Estoque em lote
  const [loteEstoqueAlvo, setLoteEstoqueAlvo] = useState<string>("todos");
  const [loteEstoqueQtd, setLoteEstoqueQtd] = useState<string>("1000");
  const [salvandoEstoqueLote, setSalvandoEstoqueLote] = useState(false);

  useEffect(() => {
    if (!data) return;
    const r = data.map((p) => ({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo_modelo,
      estoque: String(p.estoque),
      categoriaId: p.categoria_id,
      categoriaNome: p.categorias?.nome ?? "Sem categoria",
      precos: Object.fromEntries(
        FAIXAS.map((q) => {
          const f = p.faixas_preco.find((x) => x.quantidade_minima === q);
          return [q, f ? money(Number(f.preco_peca)) : ""];
        })
      ),
    }));
    setRows(r);
    setOrig(JSON.stringify(r));
    if (!selectedCatId && categorias.length > 0 && categorias[0]?.id) {
      setSelectedCatId(categorias[0].id);
    }
  }, [data, categorias]);

  useEffect(() => {
    if (!configData) return;
    const sf = (configData.menu_links as Record<string, unknown>) || {};
    const isAtivo = sf["selo_black_friday"] !== undefined ? Boolean(sf["selo_black_friday"]) : true;
    setSeloAtivo(isAtivo);
    setSeloUrl((sf["selo_promocional_url"] as string) || null);
    const prodIds = Array.isArray(sf["selo_produtos_ids"]) ? (sf["selo_produtos_ids"] as string[]) : null;
    if (prodIds && prodIds.length > 0) {
      setAlvoSelo("selecionados");
      setSelectedIds(new Set(prodIds));
    } else {
      setAlvoSelo("todos");
    }
  }, [configData]);

  const origRows: Row[] = orig ? JSON.parse(orig) : [];
  const changed = rows.filter((r, i) => JSON.stringify(r) !== JSON.stringify(origRows[i]));

  function upd(i: number, patch: Partial<Row> | ((r: Row) => Row)) {
    setRows((rs) => rs.map((r, n) => (n === i ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    }
  }

  function restaurarOriginais() {
    if (!orig) return;
    setRows(JSON.parse(orig));
    toast.info("Valores da tabela restaurados para os dados atuais do banco.");
  }

  function calcularPrecoComDesconto(precoOriginal: number, tipo: "porcentagem" | "fixo", valor: number): number {
    if (tipo === "porcentagem") {
      const mult = Math.max(0, 1 - valor / 100);
      return Math.max(1, Math.round(precoOriginal * mult * 100) / 100);
    } else {
      return Math.max(1, Math.round((precoOriginal - valor) * 100) / 100);
    }
  }

  async function aplicarDescontoPromocao(salvarDireto = false) {
    const valNum = Number(valorDesconto.replace(",", "."));
    if (isNaN(valNum) || valNum <= 0) {
      toast.error("Informe um valor de desconto válido maior que zero.");
      return;
    }
    if (tipoDesconto === "porcentagem" && valNum > 90) {
      toast.error("O desconto percentual não pode ser maior que 90%.");
      return;
    }

    let targetRows: Row[] = [];
    let alvoDescricao = "";

    if (alvoDesconto === "todos") {
      targetRows = rows;
      alvoDescricao = `todos os ${rows.length} produtos da loja`;
    } else if (alvoDesconto === "selecionados") {
      targetRows = rows.filter((r) => selectedIds.has(r.id));
      if (!targetRows.length) {
        toast.error("Nenhum produto selecionado. Marque os produtos desejados na tabela abaixo.");
        return;
      }
      alvoDescricao = `${targetRows.length} ${targetRows.length === 1 ? "produto selecionado" : "produtos selecionados"}`;
    } else {
      if (!descontoCatId) {
        toast.error("Selecione uma categoria para aplicar o desconto.");
        return;
      }
      targetRows = rows.filter((r) => r.categoriaId === descontoCatId);
      const catObj = categorias.find((c) => c.id === descontoCatId);
      alvoDescricao = `${targetRows.length} produtos da categoria "${catObj?.nome ?? "Categoria"}"`;
    }

    if (!targetRows.length) {
      toast.error("Nenhum produto encontrado para aplicar o desconto.");
      return;
    }

    const targetIds = new Set(targetRows.map((r) => r.id));

    // Preenche na tabela local
    const novasLinhas = rows.map((r) => {
      if (!targetIds.has(r.id)) return r;
      const novosPrecos: Record<number, string> = {};
      for (const q of FAIXAS) {
        const precoAtual = parsePreco(r.precos[q] ?? "");
        if (precoAtual !== null && precoAtual > 0) {
          const novo = calcularPrecoComDesconto(precoAtual, tipoDesconto, valNum);
          novosPrecos[q] = money(novo);
        } else {
          novosPrecos[q] = r.precos[q];
        }
      }
      return { ...r, precos: { ...r.precos, ...novosPrecos } };
    });

    setRows(novasLinhas);

    const txtDesconto = tipoDesconto === "porcentagem" ? `${valNum}%` : `R$ ${money(valNum)}`;

    if (!salvarDireto) {
      toast.success(
        `Desconto de ${txtDesconto} preenchido na tabela para ${alvoDescricao}. Clique em "Salvar" no topo para gravar no banco.`
      );
      return;
    }

    // Salvar direto no banco
    setAplicandoDesconto(true);
    try {
      const faixasToUpsert = targetRows.flatMap((r) => {
        const rowAtualizada = novasLinhas.find((x) => x.id === r.id);
        return FAIXAS.map((q) => {
          const v = parsePreco(rowAtualizada?.precos[q] ?? r.precos[q] ?? "");
          return {
            produto_id: r.id,
            quantidade_minima: q,
            preco_peca: v ?? 0,
          };
        }).filter((f) => f.preco_peca > 0);
      });

      const { error } = await supabase
        .from("faixas_preco")
        .upsert(faixasToUpsert, { onConflict: "produto_id,quantidade_minima" });
      if (error) throw error;

      toast.success(`Desconto de ${txtDesconto} salvo no banco para ${alvoDescricao}!`);
      qc.invalidateQueries({ queryKey: ["admin", "precos"] });
      invalidateStore(qc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar desconto no banco.");
    } finally {
      setAplicandoDesconto(false);
    }
  }

  async function salvarConfigSelo(
    novoAtivo?: boolean,
    novaUrl?: string | null,
    novoAlvo?: "todos" | "selecionados"
  ) {
    setSalvandoSelo(true);
    try {
      const menuAtual = (configData?.menu_links as Record<string, unknown>) || {};
      const targetAlvo = novoAlvo ?? alvoSelo;
      const targetAtivo = novoAtivo !== undefined ? novoAtivo : seloAtivo;
      const targetUrl = novaUrl !== undefined ? novaUrl : seloUrl;
      const seloIds = targetAlvo === "selecionados" ? Array.from(selectedIds) : null;

      if (targetAlvo === "selecionados" && (!seloIds || seloIds.length === 0)) {
        toast.error("Selecione ao menos um produto na tabela abaixo para exibir o selo apenas nos selecionados.");
        setSalvandoSelo(false);
        return;
      }

      const payload = {
        ...menuAtual,
        selo_black_friday: targetAtivo,
        selo_promocional_url: targetUrl,
        selo_produtos_ids: seloIds,
      };

      const { error } = await supabase.from("configuracoes").update({ menu_links: payload }).eq("id", 1);
      if (error) throw error;

      toast.success("Selo promocional atualizado com sucesso na loja!");
      qc.invalidateQueries({ queryKey: ["admin", "config-precos"] });
      qc.invalidateQueries({ queryKey: ["admin", "config"] });
      invalidateStore(qc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar selo promocional.");
    } finally {
      setSalvandoSelo(false);
    }
  }

  async function enviarSelo(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O selo deve ter no máximo 5MB.");
      return;
    }
    setUploadingSelo(true);
    try {
      let uploadPayload: Blob | File = file;
      let ext = file.name.split(".").pop()?.toLowerCase() || "webp";
      let contentType = file.type || "image/webp";

      if (file.type !== "image/png" && file.type !== "image/webp" && file.type !== "image/svg+xml") {
        uploadPayload = await resizeToWebp(file, 800, 0.95);
        ext = "webp";
        contentType = "image/webp";
      }

      const path = `promocoes/selo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("produtos").upload(path, uploadPayload, {
        contentType,
        upsert: true,
      });
      if (error) throw error;

      setSeloUrl(path);
      await salvarConfigSelo(true, path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar novo selo.");
    } finally {
      setUploadingSelo(false);
    }
  }

  async function aplicarPrecosCategoria(salvarDireto = false) {
    if (!selectedCatId) {
      toast.error("Selecione uma categoria primeiro.");
      return;
    }
    const parsed: Record<number, number> = {};
    for (const q of FAIXAS) {
      const txt = catPrecos[q]?.trim();
      if (!txt) {
        toast.error(`Informe o preço para a faixa de ${q}+ peças.`);
        return;
      }
      const val = parsePreco(txt);
      if (val === null) {
        toast.error(`Preço inválido para a faixa de ${q}+ peças.`);
        return;
      }
      parsed[q] = val;
    }

    const targetRows = rows.filter((r) => r.categoriaId === selectedCatId);
    if (!targetRows.length) {
      toast.error("Nenhum produto encontrado nesta categoria.");
      return;
    }

    const catObj = categorias.find((c) => c.id === selectedCatId);
    const catNome = catObj?.nome ?? "Categoria";
    const formattedPrecos = Object.fromEntries(FAIXAS.map((q) => [q, money(parsed[q] ?? 0)]));

    setRows((rs) =>
      rs.map((r) => (r.categoriaId === selectedCatId ? { ...r, precos: { ...r.precos, ...formattedPrecos } } : r))
    );

    if (!salvarDireto) {
      toast.success(
        `Preços preenchidos para ${targetRows.length} ${targetRows.length === 1 ? "produto" : "produtos"} de "${catNome}". Clique em Salvar para gravar no banco.`
      );
      return;
    }

    setAplicandoLote(true);
    try {
      const faixasToUpsert = targetRows.flatMap((r) =>
        FAIXAS.map((q) => ({
          produto_id: r.id,
          quantidade_minima: q,
          preco_peca: parsed[q] ?? 0,
        }))
      );
      const { error } = await supabase
        .from("faixas_preco")
        .upsert(faixasToUpsert, { onConflict: "produto_id,quantidade_minima" });
      if (error) throw error;
      toast.success(`Preços salvos no banco para todos os ${targetRows.length} produtos de "${catNome}"!`);
      qc.invalidateQueries({ queryKey: ["admin", "precos"] });
      invalidateStore(qc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar preços da categoria.");
    } finally {
      setAplicandoLote(false);
    }
  }

  async function aplicarEstoqueLote(salvarDireto = false) {
    const qtdNum = Math.max(0, parseInt(loteEstoqueQtd, 10) || 0);
    const targetRows =
      loteEstoqueAlvo === "todos" ? rows : rows.filter((r) => r.categoriaId === loteEstoqueAlvo);

    if (!targetRows.length) {
      toast.error("Nenhum produto encontrado para aplicar o estoque.");
      return;
    }

    const catObj = categorias.find((c) => c.id === loteEstoqueAlvo);
    const alvoNome =
      loteEstoqueAlvo === "todos"
        ? `todos os ${targetRows.length} produtos da loja`
        : `${targetRows.length} produtos de "${catObj?.nome ?? "Categoria"}"`;

    setRows((rs) =>
      rs.map((r) =>
        loteEstoqueAlvo === "todos" || r.categoriaId === loteEstoqueAlvo
          ? { ...r, estoque: String(qtdNum) }
          : r
      )
    );

    if (!salvarDireto) {
      toast.success(
        `Estoque de ${qtdNum} peças preenchido na tabela para ${alvoNome}. Clique em "Salvar" no topo para gravar.`
      );
      return;
    }

    setSalvandoEstoqueLote(true);
    try {
      const ids = targetRows.map((r) => r.id);
      const { error } = await supabase.from("produtos").update({ estoque: qtdNum }).in("id", ids);
      if (error) throw error;
      toast.success(`Estoque de ${qtdNum} peças salvo no banco para ${alvoNome}!`);
      qc.invalidateQueries({ queryKey: ["admin"] });
      invalidateStore(qc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar estoque no banco.");
    } finally {
      setSalvandoEstoqueLote(false);
    }
  }

  async function salvar() {
    const faixas: { produto_id: string; quantidade_minima: number; preco_peca: number }[] = [];
    for (const r of changed) {
      if (!r.nome.trim()) {
        toast.error("O nome do produto não pode ficar vazio.");
        return;
      }
      for (const q of FAIXAS) {
        const v = parsePreco(r.precos[q] ?? "");
        if (r.precos[q]?.trim() && v === null) {
          toast.error(`${r.nome}: preço inválido na faixa de ${q}.`);
          return;
        }
        if (v !== null) faixas.push({ produto_id: r.id, quantidade_minima: q, preco_peca: v });
      }
    }
    setSaving(true);
    const results = await Promise.all([
      faixas.length
        ? supabase.from("faixas_preco").upsert(faixas, { onConflict: "produto_id,quantidade_minima" })
        : Promise.resolve({ error: null }),
      ...changed.map((r) =>
        supabase
          .from("produtos")
          .update({ nome: r.nome.trim(), estoque: Math.max(0, parseInt(r.estoque, 10) || 0) })
          .eq("id", r.id)
      ),
    ]);
    setSaving(false);
    const err = results.find((x) => x.error)?.error;
    if (err) {
      toast.error(err.message);
      return;
    }
    toast.success(`${changed.length} ${changed.length === 1 ? "produto atualizado" : "produtos atualizados"}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
    invalidateStore(qc);
  }

  return (
    <AdminPage
      title="Edição rápida"
      description="Nomes, preços, descontos promocionais, selos e estoque: edite várias linhas e salve de uma vez."
      actions={
        <div className="flex items-center gap-2">
          {changed.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={restaurarOriginais} className="gap-1.5 text-xs">
              <Undo2 className="size-3.5" /> Desfazer alterações
            </Button>
          )}
          <Button onClick={salvar} disabled={!changed.length || saving} className="gap-1.5 font-bold">
            {saving ? <Loader2 className="animate-spin size-4" /> : <Save className="size-4" />}{" "}
            Salvar{changed.length ? ` (${changed.length})` : ""}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* CARD 1: Desconto Promocional em Lote */}
          <div className="mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-bold text-base sm:text-lg text-foreground">
                  <Tag className="size-5 text-primary" /> Desconto Promocional em Lote (Fazer Promoção)
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Aplique um desconto percentual (%) ou valor fixo (R$) em todos os produtos ou apenas nos selecionados.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary w-fit">
                <Percent className="size-3.5" />
                <span>{selectedIds.size} selecionados na tabela</span>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {/* Onde aplicar */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Aplicar promoção em</label>
                  <select
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={alvoDesconto}
                    onChange={(e) => setAlvoDesconto(e.target.value as "todos" | "selecionados" | "categoria")}
                  >
                    <option value="todos">Todos os produtos da loja ({rows.length})</option>
                    <option value="selecionados">
                      Apenas produtos selecionados ({selectedIds.size} selecionados)
                    </option>
                    <option value="categoria">Apenas por categoria específica</option>
                  </select>
                </div>

                {/* Categoria específica (se selecionado) */}
                {alvoDesconto === "categoria" ? (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Escolha a categoria</label>
                    <select
                      className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={descontoCatId}
                      onChange={(e) => setDescontoCatId(e.target.value)}
                    >
                      <option value="">Selecione uma categoria...</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({rows.filter((r) => r.categoriaId === c.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Tipo de desconto</label>
                    <div className="grid grid-cols-2 gap-1.5 h-11 p-1 bg-muted/60 rounded-lg border border-input">
                      <button
                        type="button"
                        onClick={() => setTipoDesconto("porcentagem")}
                        className={`text-xs font-bold rounded-md transition ${
                          tipoDesconto === "porcentagem"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        % Porcento
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoDesconto("fixo")}
                        className={`text-xs font-bold rounded-md transition ${
                          tipoDesconto === "fixo"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        R$ Fixo
                      </button>
                    </div>
                  </div>
                )}

                {/* Valor do desconto */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    {tipoDesconto === "porcentagem" ? "Desconto (%)" : "Desconto (R$ por peça)"}
                  </label>
                  <div className="relative">
                    <input
                      className={cell}
                      inputMode="decimal"
                      placeholder={tipoDesconto === "porcentagem" ? "Ex.: 10" : "Ex.: 3,00"}
                      value={valorDesconto}
                      onChange={(e) => setValorDesconto(e.target.value)}
                    />
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      {tipoDesconto === "porcentagem" ? "%" : "R$"}
                    </span>
                  </div>
                </div>

                {/* Atalhos rápidos */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Atalhos rápidos</label>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {tipoDesconto === "porcentagem" ? (
                      <>
                        {["5", "10", "15", "20"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setValorDesconto(v)}
                            className="px-2 py-1 text-xs font-bold rounded-md border border-input bg-background hover:bg-muted text-foreground"
                          >
                            -{v}%
                          </button>
                        ))}
                      </>
                    ) : (
                      <>
                        {["2", "3", "5", "8"].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setValorDesconto(v)}
                            className="px-2 py-1 text-xs font-bold rounded-md border border-input bg-background hover:bg-muted text-foreground"
                          >
                            -R${v}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação do Desconto */}
              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => aplicarDescontoPromocao(false)}
                  disabled={aplicandoDesconto}
                  className="w-full sm:w-auto font-semibold"
                >
                  Preencher na tabela
                </Button>
                <Button
                  type="button"
                  onClick={() => aplicarDescontoPromocao(true)}
                  disabled={aplicandoDesconto}
                  className="w-full sm:w-auto font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {aplicandoDesconto ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
                  Aplicar e Salvar no banco
                </Button>
              </div>
            </div>
          </div>

          {/* CARD 2: Selo Promocional nos Produtos (Estilo Black Friday) */}
          <div className="mb-6 rounded-2xl border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative size-16 sm:size-20 shrink-0 rounded-xl border border-border/60 bg-muted/30 p-1 flex items-center justify-center overflow-hidden">
                  <img
                    src={seloUrl ? mediaUrl(seloUrl) : seloBlackFridayImg}
                    alt="Selo Promocional"
                    className="size-full object-contain drop-shadow-md"
                  />
                  {uploadingSelo && (
                    <div className="absolute inset-0 bg-background/85 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-bold text-sm sm:text-base text-foreground">
                    <Flame className="size-4 text-amber-500" />
                    <span>Selo Promocional nos Produtos (Estilo Black Friday)</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    Exibido no canto superior direito da imagem dos produtos. Ative ou substitua por qualquer outra arte promocional (Natal, Saldão, Ofertas).
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingSelo}
                      onClick={() => seloInputRef.current?.click()}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      {uploadingSelo ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Enviando...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="size-3.5" /> Substituir selo
                        </>
                      )}
                    </Button>
                    {seloUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingSelo}
                        onClick={async () => {
                          setSeloUrl(null);
                          await salvarConfigSelo(undefined, null);
                        }}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      >
                        <RotateCcw className="size-3.5" /> Restaurar padrão
                      </Button>
                    )}
                    <input
                      ref={seloInputRef}
                      type="file"
                      accept="image/png,image/webp,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void enviarSelo(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Controles do Selo: Ativar e Alvo */}
              <div className="flex flex-col sm:items-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground">
                    {seloAtivo ? "Selo Ativado na Loja" : "Selo Desativado"}
                  </span>
                  <Switch
                    checked={seloAtivo}
                    onCheckedChange={(val) => {
                      setSeloAtivo(val);
                      void salvarConfigSelo(val);
                    }}
                    aria-label="Ativar selo promocional nos produtos"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Exibir selo em:</label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={alvoSelo}
                    onChange={(e) => {
                      const val = e.target.value as "todos" | "selecionados";
                      setAlvoSelo(val);
                      void salvarConfigSelo(undefined, undefined, val);
                    }}
                  >
                    <option value="todos">Todos os produtos ({rows.length})</option>
                    <option value="selecionados">
                      Apenas selecionados ({selectedIds.size})
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: Preço em lote por categoria */}
          <div className="mb-6 rounded-2xl border bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-base sm:text-lg">
                <Sparkles className="size-5 text-primary" /> Preço da Categoria Inteira de Uma Vez
              </h2>
              <p className="text-sm text-muted-foreground">
                Selecione uma categoria, informe os 4 preços e aplique a todos os produtos dela em um clique.
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Categoria</label>
                  <select
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                  >
                    {categorias.map((c) => {
                      const count = rows.filter((r) => r.categoriaId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {FAIXAS.map((q) => (
                  <div key={q}>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">{q}+ peças (R$)</label>
                    <input
                      className={cell}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={catPrecos[q]}
                      onChange={(e) => setCatPrecos((prev) => ({ ...prev, [q]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => aplicarPrecosCategoria(false)}
                  disabled={aplicandoLote}
                  className="w-full sm:w-auto"
                >
                  Preencher na tabela
                </Button>
                <Button
                  type="button"
                  onClick={() => aplicarPrecosCategoria(true)}
                  disabled={aplicandoLote}
                  className="w-full sm:w-auto"
                >
                  {aplicandoLote ? <Loader2 className="animate-spin" /> : <CheckCheck className="size-4" />}
                  Aplicar e Salvar no banco
                </Button>
              </div>
            </div>
          </div>

          {/* CARD 4: Alterar Estoque Tudo de Uma Vez */}
          <div className="mb-6 rounded-2xl border bg-card p-4 sm:p-5 shadow-xs">
            <div>
              <h2 className="flex items-center gap-2 font-semibold text-base sm:text-lg">
                <Package className="size-5 text-primary" /> Alterar Estoque Tudo de Uma Vez
              </h2>
              <p className="text-sm text-muted-foreground">
                Informe a quantidade de estoque e aplique a todos os produtos da loja ou por categoria com um clique.
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Aplicar estoque em</label>
                  <select
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={loteEstoqueAlvo}
                    onChange={(e) => setLoteEstoqueAlvo(e.target.value)}
                  >
                    <option value="todos">Todos os produtos da loja ({rows.length})</option>
                    {categorias.map((c) => {
                      const count = rows.filter((r) => r.categoriaId === c.id).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Novo estoque (peças)
                  </label>
                  <input
                    className={cell}
                    inputMode="numeric"
                    placeholder="Ex.: 1000"
                    value={loteEstoqueQtd}
                    onChange={(e) => setLoteEstoqueQtd(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => aplicarEstoqueLote(false)}
                  disabled={salvandoEstoqueLote}
                  className="w-full sm:w-auto"
                >
                  Preencher na tabela
                </Button>
                <Button
                  type="button"
                  onClick={() => aplicarEstoqueLote(true)}
                  disabled={salvandoEstoqueLote}
                  className="w-full sm:w-auto"
                >
                  {salvandoEstoqueLote ? <Loader2 className="animate-spin" /> : <CheckCheck className="size-4" />}
                  Aplicar e Salvar no banco
                </Button>
              </div>
            </div>
          </div>

          {/* Barra de seleção rápida de produtos */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {selectedIds.size === rows.length && rows.length > 0 ? (
                  <>
                    <CheckSquare className="size-3.5 text-primary" /> Desmarcar todos
                  </>
                ) : (
                  <>
                    <Square className="size-3.5" /> Selecionar todos ({rows.length})
                  </>
                )}
              </Button>
              {selectedIds.size > 0 && (
                <span className="text-xs font-bold text-primary">
                  {selectedIds.size} de {rows.length} produtos selecionados
                </span>
              )}
            </div>
            {selectedIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar seleção
              </Button>
            )}
          </div>

          {/* Versão Mobile */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r, i) => {
              const isSelected = selectedIds.has(r.id);
              return (
                <li
                  key={r.id}
                  className={`rounded-2xl border p-3 transition ${
                    isSelected ? "border-primary/50 bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 size-4 rounded border-input text-primary focus:ring-primary cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <label className="text-sm block">
                        <span className="text-muted-foreground text-xs">{r.codigo}</span>
                        <input className={nameCell} value={r.nome} onChange={(e) => upd(i, { nome: e.target.value })} />
                      </label>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 pl-6">
                    {FAIXAS.map((q) => (
                      <label key={q} className="text-sm">
                        <span className="text-muted-foreground">{q}+ peças (R$)</span>
                        <input
                          className={cell}
                          inputMode="decimal"
                          value={r.precos[q]}
                          onChange={(e) =>
                            upd(i, (x) => ({ ...x, precos: { ...x.precos, [q]: e.target.value } }))
                          }
                        />
                      </label>
                    ))}
                    <label className="col-span-2 text-sm">
                      <span className="text-muted-foreground">Estoque (peças)</span>
                      <input
                        className={cell}
                        inputMode="numeric"
                        value={r.estoque}
                        onChange={(e) => upd(i, { estoque: e.target.value.replace(/\D/g, "") })}
                      />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Versão Desktop: Tabela Editável */}
          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full text-left">
              <thead className="border-b text-sm text-muted-foreground">
                <tr>
                  <th className="w-10 p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                      title="Selecionar todos os produtos"
                    />
                  </th>
                  <th className="p-3 font-medium">Produto</th>
                  {FAIXAS.map((q) => (
                    <th key={q} className="w-28 p-3 text-right font-medium">
                      {q}+ (R$)
                    </th>
                  ))}
                  <th className="w-28 p-3 text-right font-medium">Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, i) => {
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <tr key={r.id} className={isSelected ? "bg-primary/5" : undefined}>
                      <td className="p-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(r.id)}
                          className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="min-w-56 p-1.5">
                        <input
                          aria-label={`Nome ${r.codigo}`}
                          className={nameCell}
                          value={r.nome}
                          onChange={(e) => upd(i, { nome: e.target.value })}
                        />
                        <p className="px-2 pt-0.5 text-xs text-muted-foreground">{r.codigo}</p>
                      </td>
                      {FAIXAS.map((q) => (
                        <td key={q} className="p-1.5">
                          <input
                            aria-label={`${r.nome} ${q}+`}
                            className={cell}
                            inputMode="decimal"
                            value={r.precos[q]}
                            onChange={(e) =>
                              upd(i, (x) => ({ ...x, precos: { ...x.precos, [q]: e.target.value } }))
                            }
                          />
                        </td>
                      ))}
                      <td className="p-1.5">
                        <input
                          aria-label={`${r.nome} estoque`}
                          className={cell}
                          inputMode="numeric"
                          value={r.estoque}
                          onChange={(e) => upd(i, { estoque: e.target.value.replace(/\D/g, "") })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPage>
  );
}
