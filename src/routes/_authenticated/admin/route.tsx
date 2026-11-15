import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, Menu, Package, Receipt, Settings, Tags, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/store/logo";
import { ThemeToggle } from "@/components/store/theme-toggle";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // The role is checked by the database (security definer), never by the browser.
    const { data, error } = await supabase.rpc("is_admin");
    if (error || data !== true) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Painel | Líder Atacado" },
      { name: "description", content: "Painel de gestão da Líder Atacado." },
      { property: "og:title", content: "Painel | Líder Atacado" },
      { property: "og:description", content: "Painel de gestão da Líder Atacado." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: Receipt },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/precos", label: "Edição rápida", icon: Tags },
  { to: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" onClick={onNavigate}>
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          activeOptions={{ exact: "exact" in n && n.exact }}
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          activeProps={{ className: "bg-accent !text-accent-foreground" }}
        >
          <n.icon className="size-5" /> {n.label}
        </Link>
      ))}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium text-muted-foreground hover:bg-accent"
      >
        <ExternalLink className="size-5" /> Ver loja
      </a>
    </nav>
  );
}

function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function sair() {
    await qc.cancelQueries();
    qc.removeQueries({ queryKey: ["admin"] });
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/admin" className="mb-6 flex items-center gap-3 px-2">
          <Logo size={40} />
          <span className="font-display font-bold">Painel</span>
        </Link>
        <NavLinks />
        <div className="mt-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" className="flex-1 justify-start" onClick={sair}>
            <LogOut /> Sair
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu do painel">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80vw] max-w-xs bg-sidebar">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Logo size={36} /> Painel
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <Button variant="outline" className="mt-6 w-full" onClick={sair}>
                <LogOut /> Sair
              </Button>
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <Logo size={36} />
            <span className="truncate font-display font-bold">Painel</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
