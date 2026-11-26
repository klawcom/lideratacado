import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { Tables } from "@/integrations/supabase/types";
import { mediaUrl } from "./media";

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

export type SiteBannerItem = {
  id: number;
  wide: string | null;
  mobile: string | null;
  link?: string | null;
  titulo?: string | null;
  subtitulo?: string | null;
};

export const getSiteData = createServerFn({ method: "GET" }).handler(async () => {
  const { publicDb, requestOrigin } = await import("./public-db.server");
  const db = publicDb();
  const [{ data: config, error }, { data: categorias }] = await Promise.all([
    db.from("configuracoes").select("*").eq("id", 1).maybeSingle(),
    db.from("categorias").select("id, nome, slug").order("ordem").order("nome"),
  ]);
  if (error) throw new Error(error.message);

  const bannersList: SiteBannerItem[] = [];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bannerFiles } = await supabaseAdmin.storage.from("produtos").list("banners");
    const fileNames = new Set(bannerFiles?.map((b) => b.name) ?? []);

    const rawMenu = config?.menu_links as Record<string, unknown> | null;
    const bannersMeta = Array.isArray(rawMenu?.["banners"])
      ? (rawMenu?.["banners"] as Array<{ id?: number; link?: string; titulo?: string; subtitulo?: string }>)
      : [];

    const meta1 = bannersMeta.find((m) => m?.id === 1);
    const meta2 = bannersMeta.find((m) => m?.id === 2);
    const meta3 = bannersMeta.find((m) => m?.id === 3);

    // Slot 1: Principal
    const b1Wide = fileNames.has("hero-wide.webp")
      ? "banners/hero-wide.webp"
      : fileNames.has("banner-1-wide.webp")
        ? "banners/banner-1-wide.webp"
        : null;
    const b1Mobile = fileNames.has("hero-mobile.webp")
      ? "banners/hero-mobile.webp"
      : fileNames.has("banner-1-mobile.webp")
        ? "banners/banner-1-mobile.webp"
        : null;

    bannersList.push({
      id: 1,
      wide: b1Wide,
      mobile: b1Mobile,
      link: meta1?.link || null,
      titulo: meta1?.titulo || null,
      subtitulo: meta1?.subtitulo || null,
    });

    // Slot 2
    const b2Wide = fileNames.has("banner-2-wide.webp") ? "banners/banner-2-wide.webp" : null;
    const b2Mobile = fileNames.has("banner-2-mobile.webp") ? "banners/banner-2-mobile.webp" : null;
    if (b2Wide || b2Mobile) {
      bannersList.push({
        id: 2,
        wide: b2Wide,
        mobile: b2Mobile,
        link: meta2?.link || null,
        titulo: meta2?.titulo || null,
        subtitulo: meta2?.subtitulo || null,
      });
    }

    // Slot 3
    const b3Wide = fileNames.has("banner-3-wide.webp") ? "banners/banner-3-wide.webp" : null;
    const b3Mobile = fileNames.has("banner-3-mobile.webp") ? "banners/banner-3-mobile.webp" : null;
    if (b3Wide || b3Mobile) {
      bannersList.push({
        id: 3,
        wide: b3Wide,
        mobile: b3Mobile,
        link: meta3?.link || null,
        titulo: meta3?.titulo || null,
        subtitulo: meta3?.subtitulo || null,
      });
    }
  } catch {
    // Falls back gracefully to default hero banner 1
    bannersList.push({ id: 1, wide: null, mobile: null });
  }

  const rawMenu = config?.menu_links as Record<string, unknown> | null;
  const homeDisplay = (rawMenu?.["home_display"] as { exibir_banners?: boolean; exibir_vitrine?: boolean; selo_black_friday?: boolean; selo_url?: string | null } | undefined) ?? {};
  const exibirBanners = typeof homeDisplay.exibir_banners === "boolean" ? homeDisplay.exibir_banners : false;
  const exibirVitrine = typeof homeDisplay.exibir_vitrine === "boolean" ? homeDisplay.exibir_vitrine : true;
  const seloBlackFriday = rawMenu?.["selo_black_friday"] !== undefined
    ? Boolean(rawMenu["selo_black_friday"])
    : typeof homeDisplay.selo_black_friday === "boolean"
      ? homeDisplay.selo_black_friday
      : true;

  const rawSeloUrl = (rawMenu?.["selo_promocional_url"] as string | undefined) || (homeDisplay.selo_url as string | undefined) || null;
  const seloUrl = rawSeloUrl ? mediaUrl(rawSeloUrl) : null;
  const seloProdutosIds = Array.isArray(rawMenu?.["selo_produtos_ids"])
    ? (rawMenu["selo_produtos_ids"] as string[])
    : null;

  // Sanitiza menu_links para não expor tokens sensíveis (superfrete, resend) para clientes anônimos da loja
  const safeConfig = config
    ? {
        ...config,
        menu_links: {
          links: rawMenu?.["links"] ?? [],
          banners: rawMenu?.["banners"] ?? [],
          selo_black_friday: seloBlackFriday,
          selo_promocional_url: rawSeloUrl,
          selo_produtos_ids: seloProdutosIds,
        },
      }
    : (config as unknown as Config);

  return {
    config: safeConfig as Config,
    categorias: categorias ?? [],
    banners: {
      wide: bannersList[0]?.wide ?? null,
      mobile: bannersList[0]?.mobile ?? null,
      items: bannersList,
    },
    home_display: {
      exibir_banners: exibirBanners,
      exibir_vitrine: exibirVitrine,
      selo_black_friday: seloBlackFriday,
      selo_url: seloUrl,
      selo_produtos_ids: seloProdutosIds,
    },
    origin: requestOrigin(getRequest()),
  };
});

export const siteQuery = () =>
  queryOptions({ queryKey: ["site"], queryFn: () => getSiteData(), staleTime: 15_000 });

export const getHome = createServerFn({ method: "GET" }).handler(async () => {
  const { publicDb } = await import("./public-db.server");
  const db = publicDb();
  const [{ data: cats, error: errCats }, { data: cfg }] = await Promise.all([
    db
      .from("categorias")
      .select(`id, nome, slug, descricao, ordem, produtos(${CARD_SELECT})`)
      .order("ordem")
      .order("nome"),
    db.from("configuracoes").select("menu_links").eq("id", 1).maybeSingle(),
  ]);
  if (errCats) throw new Error(errCats.message);

  let limiteCategorias = 0; // 0 = todas
  let limiteProdutos = 8; // default 8

  if (cfg?.menu_links && typeof cfg.menu_links === "object" && !Array.isArray(cfg.menu_links)) {
    const hl = (cfg.menu_links as Record<string, any>)["home_limits"];
    if (hl && typeof hl === "object") {
      if (typeof hl.categorias === "number") limiteCategorias = Math.max(0, hl.categorias);
      if (typeof hl.produtos_por_categoria === "number") limiteProdutos = Math.max(0, hl.produtos_por_categoria);
    }
  }

  let finalCats = cats ?? [];
  if (limiteCategorias > 0) {
    finalCats = finalCats.slice(0, limiteCategorias);
  }

  return finalCats.map((c) => {
    let prods = sortCards(c.produtos as unknown as ProdutoCard[]);
    if (limiteProdutos > 0) {
      prods = prods.slice(0, limiteProdutos);
    }
    return {
      ...c,
      produtos: prods.map(normFaixas),
    };
  });
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
      const base = (descAtual.split(/Medidas aproximadas/i)[0] ?? "").trim();
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

/** Atualiza no banco a padronização de cores de todos os produtos publicados */
export const syncCoresProdutosBanco = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { decodeCoresProduto, encodeCoresProduto } = await import("./colors");

  const { data: todos, error: errBusca } = await supabaseAdmin
    .from("produtos")
    .select("id, composicao");

  if (errBusca) throw new Error(errBusca.message);
  if (!todos || todos.length === 0) return { atualizados: 0 };

  let atualizados = 0;
  for (const p of todos) {
    const compAtual = p.composicao || "";
    const { composicaoLimpa, coresHabilitadas, fotoCores } = decodeCoresProduto(compAtual);
    const novaComp = encodeCoresProduto(composicaoLimpa, coresHabilitadas, fotoCores);
    if (novaComp !== compAtual) {
      const { error: errUp } = await supabaseAdmin
        .from("produtos")
        .update({ composicao: novaComp })
        .eq("id", p.id);
      if (!errUp) atualizados++;
    }
  }

  return { atualizados, total: todos.length };
});

/** Atualiza no banco a descrição de todos os produtos cadastrados com o padrão de alta conversão e autoridade de CEO (máx 750 caracteres, sem medidas repetidas, com negrito) */
export const syncTodasDescricoesPadraoCEO = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { obterDescricaoPadraoCategoria } = await import("./product-ai-describer");

  const { data: todos, error: errBusca } = await supabaseAdmin
    .from("produtos")
    .select("id, nome, codigo_modelo, descricao, categoria_id, categorias ( id, nome, slug )");

  if (errBusca) throw new Error(errBusca.message);
  if (!todos || todos.length === 0) return { atualizados: 0, total: 0 };

  const updates = todos.map((p) => {
    const novaDescricao = obterDescricaoPadraoCategoria(p);

    return supabaseAdmin
      .from("produtos")
      .update({ descricao: novaDescricao })
      .eq("id", p.id);
  });

  await Promise.all(updates);
  return { atualizados: todos.length, total: todos.length };
});
