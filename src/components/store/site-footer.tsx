import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteQuery } from "@/lib/catalog.functions";
import { whatsappLinkNumber } from "@/lib/format";
import { analytics } from "@/lib/analytics";

export function SiteFooter() {
  const { data } = useQuery(siteQuery());
  const cfg = data?.config;
  const wa = cfg?.whatsapp || "5547991364084";
  const email = cfg?.email_contato || "lideratacado8@gmail.com";
  const [openContato, setOpenContato] = useState(false);

  return (
    <footer className="mt-16 border-t bg-card/40">
      <div className="container-page py-8">
        <div className="flex flex-col items-center justify-between gap-6 text-center text-sm text-muted-foreground md:flex-row md:text-left">
          <div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Líder Atacado. Todos os direitos reservados.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setOpenContato(true)}
              className="cursor-pointer font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Fale Conosco
            </button>
            <span className="text-border">·</span>
            <Link
              to="/sobre"
              className="font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Sobre Nós
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/como-comprar"
              className="font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Como Comprar
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/faq"
              className="font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Dúvidas (FAQ)
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/trocas-e-devolucoes"
              className="font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Trocas e Devoluções
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/privacidade"
              className="font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Privacidade (LGPD)
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={openContato} onOpenChange={setOpenContato}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="font-display text-xl font-bold">Fale Conosco</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Escolha uma das opções abaixo para falar diretamente com nosso atendimento de atacado:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            {wa && (
              <Button
                asChild
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2.5 font-semibold text-sm shadow-sm h-12"
                onClick={() => analytics.clickWhatsApp("footer")}
              >
                <a
                  href={`https://wa.me/${whatsappLinkNumber(wa)}?text=${encodeURIComponent(
                    "Olá! Vim pelo site da Líder Atacado e gostaria de mais informações."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Falar com o Fornecedor Via WhatsApp"
                >
                  <MessageCircle className="size-5 shrink-0" /> Falar com o Atendimento Via WhatsApp
                </a>
              </Button>
            )}
            {email && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full gap-2.5 font-semibold text-sm h-12 hover:bg-muted"
              >
                <a href={`mailto:${email}`} aria-label="Falar com o Fornecedor Via E-mail">
                  <Mail className="size-5 shrink-0" /> Falar Via E-mail ({email})
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
