import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { cart, type CartItem } from "./cart";
import { getProdutosPorIds } from "./catalog.functions";
import { imagemPrincipal } from "./media";

/** Keeps cart names/prices in sync with the catalog (changes in the panel show up right away). */
export function useSyncCart(items: CartItem[]) {
  const ids = useMemo(() => items.map((i) => i.produtoId).sort(), [items]);
  const { data } = useQuery({
    queryKey: ["cart-sync", ids],
    queryFn: () => getProdutosPorIds({ data: { ids } }),
    enabled: ids.length > 0,
  });
  useEffect(() => {
    if (!data) return;
    const byId = new Map(data.map((p) => [p.id, p]));
    for (const it of cart.get()) {
      const p = byId.get(it.produtoId);
      if (!p) continue;
      const next = { nome: p.nome, slug: p.slug, codigo: p.codigo_modelo, imagem: imagemPrincipal(p.produto_midias), faixas: p.faixas_preco };
      if (JSON.stringify(next) !== JSON.stringify({ nome: it.nome, slug: it.slug, codigo: it.codigo, imagem: it.imagem, faixas: it.faixas })) {
        cart.update(it.produtoId, next);
      }
    }
  }, [data]);
  return data ? new Set(data.map((p) => p.id)) : null;
}

