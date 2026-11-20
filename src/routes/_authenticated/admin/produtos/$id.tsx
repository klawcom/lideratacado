import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { excluirProdutos } from "@/lib/admin-products";
import { AdminPage, Loading, invalidateStore } from "@/components/admin/ui";
import { ProductForm, type ProdutoEdit } from "@/components/admin/product-form";
import { MediaManager } from "@/components/admin/media-manager";

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({ component: Editar });

function Editar() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "produto", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("*, faixas_preco(quantidade_minima, preco_peca)").eq("id", id).single();
      if (error) throw error;
      return { ...data, faixas_preco: data.faixas_preco.map((f) => ({ ...f, preco_peca: Number(f.preco_peca) })) } as ProdutoEdit;
    },
  });

  async function excluir() {
    if (!data || !confirm(`Excluir "${data.nome}"? Pedidos antigos continuam com o nome do produto.`)) return;
    const { error } = await excluirProdutos([id]);
    if (error) { toast.error(error); return; }
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["admin"] });
    invalidateStore(qc);
    navigate({ to: "/admin/produtos" });
  }

  return (
    <AdminPage
      title={data?.nome ?? "Produto"}
      actions={
        data && (
          <Button asChild variant="outline" size="icon" aria-label="Ver na loja">
            <a href={`/produto/${data.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
            </a>
          </Button>
        )
      }
    >
      <Link to="/admin/produtos" className="-mt-3 mb-3 inline-flex min-h-11 items-center gap-1 text-muted-foreground">
        <ChevronLeft className="size-5" /> Produtos
      </Link>
      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <MediaManager produtoId={id} initialComposicao={data.composicao} />
          <ProductForm key={data.id + data.updated_at} produto={data} />
          <div className="border-t pt-6">
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={excluir}>
              <Trash2 /> Excluir produto
            </Button>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
