import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AdminPage } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/_authenticated/admin/produtos/novo")({ component: Novo });

function Novo() {
  return (
    <AdminPage title="Novo produto" description="Depois de criar, você poderá enviar fotos e vídeos.">
      <Link to="/admin/produtos" className="-mt-3 mb-3 inline-flex min-h-11 items-center gap-1 text-muted-foreground">
        <ChevronLeft className="size-5" /> Produtos
      </Link>
      <ProductForm />
    </AdminPage>
  );
}
