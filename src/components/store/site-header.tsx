import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Mail, Menu, MessageCircle, Package, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { useCartCount } from "@/lib/cart";
import { siteQuery } from "@/lib/catalog.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { visibleMenuLinks } from "@/lib/menu-links";
import { formatWhatsappIntl, whatsappLinkNumber } from "@/lib/format";


export function SiteHeader() {
  const count = useCartCount();
  const { data } = useQuery(siteQuery());
  const { user, isAdmin } = useAuth();
  const links = visibleMenuLinks(data?.config?.menu_links);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function sair() {
    setOpen(false);
    await qc.cancelQueries();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container-page flex h-16 items-center gap-2">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Líder Atacado, página inicial">
          <Logo size={44} />
          <span className="hidden truncate font-display text-lg font-bold sm:block">Líder Atacado</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Categorias">
          {data?.categorias.map((c) => (
            <Link
              key={c.id}
              to="/categoria/$slug"
              params={{ slug: c.slug }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {c.nome}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <Button asChild variant="ghost" size="icon" aria-label="Minha conta">
              <Link to={isAdmin ? "/admin" : "/meus-pedidos"}>
                <User />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" className="px-3">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="relative" aria-label={`Carrinho, ${count} peças`}>
            <Link to="/carrinho">
              <ShoppingBag />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold leading-5 text-primary-foreground">
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Logo size={40} /> Líder Atacado
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-4 flex flex-col px-2 pb-6" onClick={() => setOpen(false)}>
                <p className="eyebrow px-3 pb-1 pt-2">Produtos</p>
                {data?.categorias.map((c) => (
                  <Link key={c.id} to="/categoria/$slug" params={{ slug: c.slug }} className="flex min-h-12 items-center rounded-xl px-3 font-medium hover:bg-accent">
                    {c.nome}
                  </Link>
                ))}
                {links.length > 0 && <p className="eyebrow px-3 pb-1 pt-5">Atendimento</p>}
                {links.map((l) => (
                  <Link key={l.to} to={l.to} className="flex min-h-12 items-center rounded-xl px-3 font-medium hover:bg-accent">
                    {l.label}
                  </Link>
                ))}
                <p className="eyebrow px-3 pb-1 pt-5">Conta</p>
                {user ? (
                  <>
                    <Link to="/meus-pedidos" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-accent">
                      <Package className="size-5" /> Meus pedidos
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-accent">
                        <LayoutDashboard className="size-5" /> Painel
                      </Link>
                    )}
                  </>
                ) : (
                  <Link to="/auth" className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-accent">
                    <User className="size-5" /> Entrar
                  </Link>
                )}
              </nav>
              {(data?.config?.whatsapp || data?.config?.email_contato) && (
                <div className="mt-2 border-t pt-4 px-4 space-y-2">
                  <p className="eyebrow pb-1">Atendimento</p>
                  {data.config.whatsapp && (
                    <Button asChild size="sm" className="w-full bg-[#14532D] hover:bg-[#0F3F24] text-white justify-start gap-2">
                      <a href={`https://wa.me/${whatsappLinkNumber(data.config.whatsapp)}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="size-4" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  {data.config.email_contato && (
                    <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2">
                      <a href={`mailto:${data.config.email_contato}`}>
                        <Mail className="size-4" /> {data.config.email_contato}
                      </a>
                    </Button>
                  )}
                </div>
              )}
              {user && (
                <div className="px-4 pb-6">
                  <p className="mb-2 truncate text-sm text-muted-foreground">{user.email}</p>
                  <Button variant="outline" className="w-full" onClick={sair}>
                    <LogOut /> Sair
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
