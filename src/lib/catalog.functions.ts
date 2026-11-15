import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";

export type Config = Tables<"configuracoes">;
export type MidiaRow = Pick<
  Tables<"produto_midias">,
  "id" | "tipo" | "url" | "video_externo" | "capa_url" | "ordem" | "principal"
>;
export type FaixaRow = { quantidade_minima: number; preco_peca: number };
export type ProdutoCard = {
  id: string;
  nome: string;
  slug: string;
  codigo_modelo: string;
  destaque: boolean;
  ordem: number;
  produto_midias: MidiaRow[];
  faixas_preco: FaixaRow[];
};
export type ProdutoFull = ProdutoCard & {
  descricao: string;
  composicao: string;
  estoque: number;
  categorias: { nome: string; slug: string } | null;
};

const CARD_SELECT =
  "id, nome, slug, codigo_modelo, destaque, ordem, produto_midias(id, tipo, url, video_externo, capa_url, ordem, principal), faixas_preco(quantidade_minima, preco_peca)";

function sortCards<T extends { destaque: boolean; ordem: number; nome: string }>(list: T[]) {
  return [...list].sort(
    (a, b) => Number(b.destaque) - Number(a.destaque) || a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  );
}

function normFaixas<T extends { faixas_preco: { quantidade_minima: number; preco_peca: number | string }[] }>(p: T): T {
  return { ...p, faixas_preco: p.faixas_preco.map((f) => ({ ...f, preco_peca: Number(f.preco_peca) })) };
}

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const { publicDb, requestOrigin } = await import("./public-db.server");
  const db = publicDb();
  const [{ data: config, error }, { data: categorias }] = await Promise.all([
    db.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
    db.from("categorias").select("id, nome, slug").order("ordem").order("nome"),
  ]);
  if (error) throw new Error(error.message);

  let bannerWide: string | null = null;
  let bannerMobile: string | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bannerFiles } = await supabaseAdmin.storage.from("produtos").list("banners");
    if (bannerFiles?.some((b) => b.name === "hero-wide.webp")) bannerWide = "banners/hero-wide.webp";
    if (bannerFiles?.some((b) => b.name === "hero-mobile.webp")) bannerMobile = "banners/hero-mobile.webp";
  } catch {
    // Falls back gracefully to bundled hero banners
  }

  return {
    config: config as Config,
    categorias: categorias ?? [],
    banners: { wide: bannerWide, mobile: bannerMobile },
    origin: requestOrigin(getRequest()),
  };
});

export const siteQuery = () =>
  queryOptions({ queryKey: ["site"], queryFn: () => getSiteData(), staleTime: 15_000 });

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const { publicDb } = await import("./public-db.server");
  const db = publicDb();
  const { data, error } = await db
    .from("categorias")
    .select(`id, nome, slug, descricao, ordem, produtos(${CARD_SELECT})`)
    .order("ordem")
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    ...c,
    produtos: sortCards(c.produtos as unknown as ProdutoCard[]).slice(0, 8).map(normFaixas),
  }));
});

export const homeQuery = () => queryOptions({ queryKey: ["home"], queryFn: () => getHome() });

export const getCategoria = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { publicDb } = await import("./public-db.server");
    const db = publicDb();
    const { data: cat, error } = await db
      .from("categorias")
      .select(`id, nome, slug, descricao, produtos(${CARD_SELECT})`)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cat) return null;
    return { ...cat, produtos: sortCards(cat.produtos as unknown as ProdutoCard[]).map(normFaixas) };
  });

export const categoriaQuery = (slug: string) =>
  queryOptions({ queryKey: ["categoria", slug], queryFn: () => getCategoria({ data: { slug } }) });

export const getProduto = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { publicDb } = await import("./public-db.server");
    const db = publicDb();
    const { data: p, error } = await db
      .from("produtos")
      .select(`${CARD_SELECT}, descricao, composicao, estoque, categorias(nome, slug)`)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return null;
    return normFaixas(p as unknown as ProdutoFull);
  });

export const produtoQuery = (slug: string) =>
  queryOptions({ queryKey: ["produto", slug], queryFn: () => getProduto({ data: { slug } }) });

/** Fresh names/prices for products already in the cart. */
export const getProdutosPorIds = createServerFn({ method: "POST" })
  .validator((d: { ids: string[] }) => z.object({ ids: z.array(z.string().uuid()).max(100) }).parse(d))
  .handler(async ({ data }) => {
    if (data.ids.length === 0) return [];
    const { publicDb } = await import("./public-db.server");
    const { data: rows, error } = await publicDb().from("produtos").select(CARD_SELECT).in("id", data.ids);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as ProdutoCard[]).map(normFaixas);
  });

/** Atualiza no banco a descrição, composição e medidas de todos os anúncios Cotton Pima */
export const syncDescricaoCottonPima = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { DESCRICAO_COMPLETA_COTTON_PIMA, COMPOSICAO_COTTON_PIMA } = await import("./pima-defaults");

  const { data: pimas, error: errBusca } = await supabaseAdmin
    .from("produtos")
    .select("id, composicao, descricao, nome, codigo_modelo")
    .or("categoria_id.eq.11111111-1111-1111-1111-111111111111,codigo_modelo.ilike.PIMA%,nome.ilike.%COTTON PIMA%");

  if (errBusca) throw new Error(errBusca.message);
  if (!pimas || pimas.length === 0) return { atualizados: 0 };

  const updates = pimas.map((p) => {
    const match = p.composicao?.match(/<!--cores:.*?-->/);
    const coresTag = match ? match[0] : "";
    const novaComposicao = `${COMPOSICAO_COTTON_PIMA}${coresTag}`;
    return supabaseAdmin
      .from("produtos")
      .update({
        descricao: DESCRICAO_COMPLETA_COTTON_PIMA,
        composicao: novaComposicao,
      })
      .eq("id", p.id);
  });

  await Promise.all(updates);
  return { atualizados: pimas.length };
});

/** Atualiza no banco a descrição e tabela de medidas de todos os anúncios da categoria Polo */
export const syncDescricaoPolos = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { TEXTO_MEDIDAS_POLO, DESCRICAO_COMPLETA_POLO, isProdutoPolo } = await import("./pima-defaults");

  const { data: todos, error: errBusca } = await supabaseAdmin
    .from("produtos")
    .select("id, descricao, nome, codigo_modelo, categoria_id, categorias ( id, nome, slug )");

  if (errBusca) throw new Error(errBusca.message);
  if (!todos || todos.length === 0) return { atualizados: 0 };

  const polos = todos.filter((p) => isProdutoPolo(p as any));
  if (polos.length === 0) return { atualizados: 0 };

  const updates = polos.map((p) => {
    const descAtual = p.descricao || "";
    let novaDesc: string;
    if (!descAtual.trim()) {
      novaDesc = DESCRICAO_COMPLETA_POLO;
    } else if (/Medidas aproximadas/i.test(descAtual)) {
      const base = descAtual.split(/Medidas aproximadas/i)[0].trim();
      novaDesc = base ? `${base}\n\n${TEXTO_MEDIDAS_POLO}` : DESCRICAO_COMPLETA_POLO;
    } else {
      novaDesc = `${descAtual.trim()}\n\n${TEXTO_MEDIDAS_POLO}`;
    }

    return supabaseAdmin
      .from("produtos")
      .update({ descricao: novaDesc })
      .eq("id", p.id);
  });

  await Promise.all(updates);
  return { atualizados: polos.length };
});
