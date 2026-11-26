import { useState, useId } from "react";
import { Star, MessageCircle, CheckCircle2, HeartHandshake } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  salvarDepoimentoLocal,
  montarMensagemWhatsappDepoimento,
  type Depoimento,
} from "@/lib/testimonials";
import { whatsappLinkNumber } from "@/lib/format";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const PERFIS = [
  "Lojista / Loja Física",
  "Revendedor(a) Autônomo(a)",
  "Sacoleira & Moda Delivery",
  "Boutique / Loja Online",
  "Comprador Atacado",
];

interface TestimonialDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDepoimentoAdicionado?: (depoimento: Depoimento) => void;
  pedidoInfo?: {
    numero?: number;
    clienteNome?: string;
    cidade?: string;
    estado?: string;
  };
  whatsappLoja?: string;
}

export function TestimonialDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onDepoimentoAdicionado,
  pedidoInfo,
  whatsappLoja = "5547991364084",
}: TestimonialDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [nome, setNome] = useState(pedidoInfo?.clienteNome || "");
  const [cidade, setCidade] = useState(pedidoInfo?.cidade || "");
  const [estado, setEstado] = useState(pedidoInfo?.estado || "SP");
  const [tipoCliente, setTipoCliente] = useState(PERFIS[0]);
  const [nota, setNota] = useState(5);
  const [hoverNota, setHoverNota] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviarWa, setEnviarWa] = useState(true);
  const [sucesso, setSucesso] = useState(false);
  const [ultimoCriado, setUltimoCriado] = useState<Depoimento | null>(null);

  const nomeId = useId();
  const cidadeId = useId();
  const estadoId = useId();
  const tipoClienteId = useId();
  const textoId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Por favor, informe seu nome.");
      return;
    }
    if (!cidade.trim()) {
      toast.error("Por favor, informe sua cidade.");
      return;
    }
    if (texto.trim().length < 15) {
      toast.error("Por favor, escreva um depoimento com pelo menos 15 caracteres.");
      return;
    }

    const novo = salvarDepoimentoLocal({
      nome,
      cidade,
      estado,
      tipoCliente,
      nota,
      texto,
    });

    setUltimoCriado(novo);
    setSucesso(true);
    onDepoimentoAdicionado?.(novo);
    toast.success("Muito obrigado pelo seu depoimento!");

    if (enviarWa) {
      const msg = montarMensagemWhatsappDepoimento(
        { nome, cidade, estado, tipoCliente, nota, texto },
        pedidoInfo?.numero,
      );
      const url = `https://wa.me/${whatsappLinkNumber(whatsappLoja)}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
    }
  }

  function handleReset() {
    setSucesso(false);
    setTexto("");
    setIsOpen?.(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {sucesso ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-10" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-bold">Depoimento Enviado!</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Sua avaliação foi registrada com sucesso e já está disponível em nosso site. Agradecemos imensamente pela sua confiança e parceria com a Líder Atacado!
              </DialogDescription>
            </DialogHeader>

            {ultimoCriado && (
              <div className="rounded-xl border bg-muted/40 p-4 text-left text-sm space-y-1.5">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: ultimoCriado.nota }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="font-semibold text-foreground">
                  {ultimoCriado.nome} · <span className="font-normal text-muted-foreground">{ultimoCriado.cidade} - {ultimoCriado.estado}</span>
                </p>
                <p className="italic text-muted-foreground text-xs leading-relaxed">
                  &ldquo;{ultimoCriado.texto}&rdquo;
                </p>
              </div>
            )}

            <Button onClick={handleReset} className="w-full mt-4">
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <HeartHandshake className="size-4" />
                <span>Avaliação do Cliente</span>
              </div>
              <DialogTitle className="text-xl font-bold">Compartilhe sua experiência</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Conte para outros lojistas e revendedores como foi seu atendimento com o Claudinei, a entrega segura no seu endereço, a qualidade das peças e o giro de vendas.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              {/* Avaliação em Estrelas */}
              <div className="space-y-1.5 text-center sm:text-left">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sua nota para a Líder Atacado:
                </Label>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= (hoverNota || nota);
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Avaliar com ${star} estrela${star > 1 ? "s" : ""}`}
                        onClick={() => setNota(star)}
                        onMouseEnter={() => setHoverNota(star)}
                        onMouseLeave={() => setHoverNota(0)}
                        className="grid size-11 place-items-center rounded-lg p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      >
                        <Star
                          className={`size-7 ${
                            isFilled
                              ? "fill-amber-400 text-amber-500 drop-shadow-xs"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-sm font-bold text-foreground">
                    {nota === 5 ? "Excelente (5/5)" : `${nota}/5`}
                  </span>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor={nomeId} className="text-xs font-medium">
                  Seu nome ou nome da sua loja *
                </Label>
                <Input
                  id={nomeId}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Mariana Silva ou Loja Estilo Moda"
                  required
                />
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor={cidadeId} className="text-xs font-medium">
                    Cidade *
                  </Label>
                  <Input
                    id={cidadeId}
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Goiânia"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={estadoId} className="text-xs font-medium">
                    Estado (UF) *
                  </Label>
                  <select
                    id={estadoId}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Perfil */}
              <div className="space-y-1.5">
                <Label htmlFor={tipoClienteId} className="text-xs font-medium">
                  Qual é o seu perfil de compra?
                </Label>
                <select
                  id={tipoClienteId}
                  value={tipoCliente}
                  onChange={(e) => setTipoCliente(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PERFIS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Texto do Depoimento */}
              <div className="space-y-1.5">
                <Label htmlFor={textoId} className="text-xs font-medium">
                  Seu depoimento sincero *
                </Label>
                <Textarea
                  id={textoId}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Conte sua história: o atendimento do Claudinei pelo WhatsApp, a chegada da encomenda lacrada no seu endereço, a qualidade das peças e suas vendas..."
                  rows={4}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Mínimo de 15 caracteres. Seja o mais natural e detalhado possível.
                </p>
              </div>

              {/* Opção WhatsApp */}
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarWa}
                  onChange={(e) => setEnviarWa(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground leading-snug">
                  Compartilhar também com a equipe no WhatsApp oficial da Líder Atacado.
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen?.(false)}
                  className="w-1/3"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="w-2/3 gap-1.5 font-bold">
                  <MessageCircle className="size-4" />
                  Publicar Depoimento
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
