import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCheck, Loader2, Package, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, invalidateStore } from "@/components/admin/ui";
import { parsePreco } from "@/components/admin/product-form";
import { FAIXAS } from "@/lib/pricing";
import { money } from "@/lib/format";

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

const cellBase = "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const cell = `${cellBase} text-right tabular-nums`;
const nameCell = `${cellBase} font-semibold`;

function Precos() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "precos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo_modelo, estoque, categoria_id, ordem, categorias(id, nome, ordem), faixas_preco(quantidade_minima, preco_peca)")
        .order("ordem");
      if (error) throw error;
      return [...data].sort((a, b) => (a.categorias?.ordem ?? 99) - (b.categorias?.ordem ?? 99) || a.ordem - b.ordem);
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

  const [rows, setRows] = useState<Row[]>([]);
  const [orig, setOrig] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Preço por categoria em lote
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [catPrecos, setCatPrecos] = useState<Record<number, string>>({ 10: "", 20: "", 30: "", 50: "" });
  const [aplicandoLote, setAplicandoLote] = useState(false);

  // Estoque em lote (tudo de uma vez ou por categoria)
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

  const origRows: Row[] = orig ? JSON.parse(orig) : [];
  const changed = rows.filter((r, i) => JSON.stringify(r) !== JSON.stringify(origRows[i]));

  function upd(i: number, patch: Partial<Row> | ((r: Row) => Row)) {
    setRows((rs) => rs.map((r, n) => (n === i ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r)));
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
    const formattedPrecos = Object.fromEntries(FAIXAS.map((q) => [q, money(parsed[q])]));

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
          preco_peca: parsed[q],
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
    const targetRows = loteEstoqueAlvo === "todos"
      ? rows
      : rows.filter((r) => r.categoriaId === loteEstoqueAlvo);

    if (!targetRows.length) {
      toast.error("Nenhum produto encontrado para aplicar o estoque.");
      return;
    }

    const catObj = categorias.find((c) => c.id === loteEstoqueAlvo);
    const alvoNome = loteEstoqueAlvo === "todos"
      ? `todos os ${targetRows.length} produtos da loja`
      : `${targetRows.length} produtos de "${catObj?.nome ?? "Categoria"}"`;

    // Atualiza o estoque na tabela local
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
      const { error } = await supabase
        .from("produtos")
        .update({ estoque: qtdNum })
        .in("id", ids);
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
      if (!r.nome.trim()) { toast.error("O nome do produto não pode ficar vazio."); return; }
      for (const q of FAIXAS) {
        const v = parsePreco(r.precos[q] ?? "");
        if (r.precos[q]?.trim() && v === null) { toast.error(`${r.nome}: preço inválido na faixa de ${q}.`); return; }
        if (v !== null) faixas.push({ produto_id: r.id, quantidade_minima: q, preco_peca: v });
      }
    }
    setSaving(true);
    const results = await Promise.all([
      faixas.length ? supabase.from("faixas_preco").upsert(faixas, { onConflict: "produto_id,quantidade_minima" }) : Promise.resolve({ error: null }),
      ...changed.map((r) => supabase.from("produtos").update({ nome: r.nome.trim(), estoque: Math.max(0, parseInt(r.estoque, 10) || 0) }).eq("id", r.id)),
    ]);
    setSaving(false);
    const err = results.find((x) => x.error)?.error;
    if (err) { toast.error(err.message); return; }
    toast.success(`${changed.length} ${changed.length === 1 ? "produto atualizado" : "produtos atualizados"}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
    invalidateStore(qc);
  }

  return (
    <AdminPage
      title="Edição rápida"
      description="Nomes, preços e estoque: edite várias linhas e salve de uma vez."
      actions={
        <Button onClick={salvar} disabled={!changed.length || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar{changed.length ? ` (${changed.length})` : ""}
        </Button>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (
        <>
          {/* Card: Preço em lote por categoria */}
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
          {/* Card: Alterar Estoque Tudo de Uma Vez */}
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
          <ul className="space-y-3 md:hidden">
            {rows.map((r, i) => (
              <li key={r.id} className="rounded-2xl border bg-card p-3">
                <label className="text-sm">
                  <span className="text-muted-foreground">Nome · {r.codigo}</span>
                  <input className={nameCell} value={r.nome} onChange={(e) => upd(i, { nome: e.target.value })} />
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {FAIXAS.map((q) => (
                    <label key={q} className="text-sm">
                      <span className="text-muted-foreground">{q}+ peças (R$)</span>
                      <input className={cell} inputMode="decimal" value={r.precos[q]} onChange={(e) => upd(i, (x) => ({ ...x, precos: { ...x.precos, [q]: e.target.value } }))} />
                    </label>
                  ))}
                  <label className="col-span-2 text-sm">
                    <span className="text-muted-foreground">Estoque (peças)</span>
                    <input className={cell} inputMode="numeric" value={r.estoque} onChange={(e) => upd(i, { estoque: e.target.value.replace(/\D/g, "") })} />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          {/* Larger screens: editable table */}
          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full text-left">
              <thead className="border-b text-sm text-muted-foreground">
                <tr>
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
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="min-w-56 p-1.5">
                      <input aria-label={`Nome ${r.codigo}`} className={nameCell} value={r.nome} onChange={(e) => upd(i, { nome: e.target.value })} />
                      <p className="px-2 pt-0.5 text-sm text-muted-foreground">{r.codigo}</p>
                    </td>
                    {FAIXAS.map((q) => (
                      <td key={q} className="p-1.5">
                        <input aria-label={`${r.nome} ${q}+`} className={cell} inputMode="decimal" value={r.precos[q]} onChange={(e) => upd(i, (x) => ({ ...x, precos: { ...x.precos, [q]: e.target.value } }))} />
                      </td>
                    ))}
                    <td className="p-1.5">
                      <input aria-label={`${r.nome} estoque`} className={cell} inputMode="numeric" value={r.estoque} onChange={(e) => upd(i, { estoque: e.target.value.replace(/\D/g, "") })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPage>
  );
}
