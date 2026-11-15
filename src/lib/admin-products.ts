import { supabase } from "@/integrations/supabase/client";

/** Deletes products plus their stored photos/videos (runs with the admin's own session). */
export async function excluirProdutos(ids: string[]) {
  if (!ids.length) return { error: null as string | null };
  const { data: midias } = await supabase.from("produto_midias").select("url, capa_url").in("produto_id", ids);
  const paths = new Set<string>();
  for (const m of midias ?? []) {
    for (const p of [m.url, m.capa_url]) if (p && !/^https?:/.test(p)) paths.add(p);
  }
  for (const id of ids) {
    const { data: files } = await supabase.storage.from("produtos").list(id);
    for (const f of files ?? []) paths.add(`${id}/${f.name}`);
  }
  const all = [...paths];
  for (let i = 0; i < all.length; i += 100) await supabase.storage.from("produtos").remove(all.slice(i, i + 100));
  const { error } = await supabase.from("produtos").delete().in("id", ids);
  return { error: error?.message ?? null };
}
