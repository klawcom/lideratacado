import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { siteQuery } from "@/lib/catalog.functions";
import { visibleMenuLinks } from "@/lib/menu-links";
import { formatWhatsappIntl, whatsappLinkNumber } from "@/lib/format";

export function SiteFooter() {
  const { data } = useQuery(siteQuery());
  const cfg = data?.config;
  const wa = cfg?.whatsapp || "5547991364084";
  const email = cfg?.email_contato || "lideratacado8@gmail.com";
  const linksInstitucional = visibleMenuLinks(cfg?.menu_links).filter(
    (l) => l.to !== "/sobre" && l.to !== "/privacidade",
  );

  return (
    <footer className="mt-20 border-t bg-muted/40">
      <div className="container-page grid gap-10 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Logo size={52} />
            <span className="font-display text-lg font-bold">Líder Atacado</span>
          </div>
          <p className="max-w-xs text-muted-foreground">Camisetas básicas e polos no atacado, a partir de 10 peças.</p>
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold">Fale Conosco</h2>
          <div className="flex flex-col items-start gap-3">
            {wa && (
              <div className="w-full">
                <Button
                  asChild
                  variant="default"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium shadow-xs min-h-11"
                >
                  <a
                    href={`https://wa.me/${whatsappLinkNumber(wa)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Falar com o Fornecedor Via WhatsApp"
                  >
                    <MessageCircle className="size-4 shrink-0" /> Falar com o Fornecedor Via WhatsApp
                  </a>
                </Button>
                <p className="mt-1 text-xs text-muted-foreground pl-1">
                  {formatWhatsappIntl(wa.replace(/^55/, ""))}
                </p>
              </div>
            )}
            {email && (
              <div className="w-full">
                <Button asChild variant="outline" className="w-full sm:w-auto gap-2 font-medium min-h-11">
                  <a href={`mailto:${email}`} aria-label="Falar com o Fornecedor Via E-mail">
                    <Mail className="size-4 shrink-0" /> Falar com o Fornecedor Via E-mail
                  </a>
                </Button>
                <p className="mt-1 text-xs text-muted-foreground pl-1">
                  {email}
                </p>
              </div>
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold">Institucional</h2>
          <ul className="grid grid-cols-1 gap-x-4">
            {linksInstitucional.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-6">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-center text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Líder Atacado. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/sobre" className="transition hover:text-foreground hover:underline underline-offset-4">
              Sobre
            </Link>
            <span className="text-border">·</span>
            <Link to="/privacidade" className="transition hover:text-foreground hover:underline underline-offset-4">
              Políticas de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
