import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminPage, Loading, invalidateStore } from "@/components/admin/ui";
import { parsePreco } from "@/components/admin/product-form";
import { FAIXAS } from "@/lib/pricing";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/precos")({ component: Precos });

type Row = { id: string; nome: string; codigo: string; estoque: string; precos: Record<number, string> };

const cell = "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-right text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Precos() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "precos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome, codigo_modelo, estoque, ordem, categorias(ordem), faixas_preco(quantidade_minima, preco_peca)").order("ordem");
      if (error) throw error;
      return [...data].sort((a, b) => (a.categorias?.ordem ?? 99) - (b.categorias?.ordem ?? 99) || a.ordem - b.ordem);
    },
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [orig, setOrig] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const r = data.map((p) => ({
      id: p.id,
      nome: p.nome,
      codigo: p.codigo_modelo,
      estoque: String(p.estoque),
      precos: Object.fromEntries(FAIXAS.map((q) => {
        const f = p.faixas_preco.find((x) => x.quantidade_minima === q);
        return [q, f ? money(Number(f.preco_peca)) : ""];
      })),
    }));
    setRows(r);
    setOrig(JSON.stringify(r));
  }, [data]);

  const origRows: Row[] = orig ? JSON.parse(orig) : [];
  const changed = rows.filter((r, i) => JSON.stringify(r) !== JSON.stringify(origRows[i]));

  function upd(i: number, patch: Partial<Row> | ((r: Row) => Row)) {
    setRows((rs) => rs.map((r, n) => (n === i ? (typeof patch === "function" ? patch(r) : { ...r, ...patch }) : r)));
  }

  async function salvar() {
    const faixas: { produto_id: string; quantidade_minima: number; preco_peca: number }[] = [];
    for (const r of changed) {
      for (const q of FAIXAS) {
        const v = parsePreco(r.precos[q] ?? "");
        if (r.precos[q]?.trim() && v === null) { toast.error(`${r.nome}: preço inválido na faixa de ${q}.`); return; }
        if (v !== null) faixas.push({ produto_id: r.id, quantidade_minima: q, preco_peca: v });
      }
    }
    setSaving(true);
    const results = await Promise.all([
      faixas.length ? supabase.from("faixas_preco").upsert(faixas, { onConflict: "produto_id,quantidade_minima" }) : Promise.resolve({ error: null }),
      ...changed.map((r) => supabase.from("produtos").update({ estoque: Math.max(0, parseInt(r.estoque, 10) || 0) }).eq("id", r.id)),
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
      title="Preços e estoque"
      description="Edite várias linhas e salve de uma vez."
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
          {/* Phone: one card per product */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r, i) => (
              <li key={r.id} className="rounded-2xl border bg-card p-3">
                <p className="font-semibold">{r.nome}</p>
                <p className="text-sm text-muted-foreground">{r.codigo}</p>
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
                    <td className="p-3">
                      <p className="font-semibold">{r.nome}</p>
                      <p className="text-sm text-muted-foreground">{r.codigo}</p>
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
