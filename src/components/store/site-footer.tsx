import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle } from "lucide-react";
import { Logo } from "./logo";
import { siteQuery } from "@/lib/catalog.functions";
import { formatWhatsappIntl, whatsappLinkNumber } from "@/lib/format";

export function SiteFooter() {
  const { data } = useQuery(siteQuery());
  const cfg = data?.config;
  const wa = cfg?.whatsapp ?? "";
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
          <h2 className="mb-3 text-base font-semibold">Contato</h2>
          <ul className="space-y-1">
            {wa && (
              <li>
                <a
                  href={`https://wa.me/${whatsappLinkNumber(wa)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 hover:text-gold-ink"
                >
                  <MessageCircle className="size-5" /> {formatWhatsappIntl(wa.replace(/^55/, ""))}
                </a>
              </li>
            )}
            {cfg?.email_contato && (
              <li>
                <a href={`mailto:${cfg.email_contato}`} className="inline-flex min-h-11 items-center gap-2 hover:text-gold-ink">
                  <Mail className="size-5" /> {cfg.email_contato}
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-base font-semibold">Institucional</h2>
          <ul className="grid grid-cols-1 gap-x-4">
            {[
              ["/sobre", "Sobre"],
              ["/como-comprar", "Como comprar"],
              ["/faq", "Dúvidas frequentes"],
              ["/trocas-e-devolucoes", "Trocas e devoluções"],
              ["/privacidade", "Política de privacidade"],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Líder Atacado. Pedidos finalizados pelo WhatsApp.
      </div>
    </footer>
  );
}
