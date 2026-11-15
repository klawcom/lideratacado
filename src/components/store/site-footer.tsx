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

export function SiteFooter() {
  const { data } = useQuery(siteQuery());
  const cfg = data?.config;
  const wa = cfg?.whatsapp || "5547991364084";
  const email = cfg?.email_contato || "lideratacado8@gmail.com";
  const [openContato, setOpenContato] = useState(false);

  return (
    <footer className="mt-16 border-t bg-card/40">
      <div className="container-page py-6">
        <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Líder Atacado. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
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
              Sobre
            </Link>
            <span className="text-border">·</span>
            <Link
              to="/privacidade"
              className="font-medium transition hover:text-foreground hover:underline underline-offset-4"
            >
              Políticas de Privacidade
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={openContato} onOpenChange={setOpenContato}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="font-display text-xl font-bold">Fale Conosco</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Escolha uma das opções abaixo para falar diretamente com nosso fornecedor:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            {wa && (
              <Button
                asChild
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2.5 font-semibold text-sm shadow-sm h-12"
              >
                <a
                  href={`https://wa.me/${whatsappLinkNumber(wa)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Falar com o Fornecedor Via WhatsApp"
                >
                  <MessageCircle className="size-5 shrink-0" /> Falar com o Fornecedor Via WhatsApp
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
                  <Mail className="size-5 shrink-0" /> Falar com o Fornecedor Via E-mail
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
