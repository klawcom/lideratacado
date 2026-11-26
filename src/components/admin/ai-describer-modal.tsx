import { useState, useEffect } from "react";
import { Sparkles, Wand2, Check, RefreshCw, Copy, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  gerarDescricaoIA,
  detectarTipoTecido,
  type TipoTecidoIA,
  type TomVozIA,
} from "@/lib/product-ai-describer";

interface AiDescriberModalProps {
  nomeProduto: string;
  codigoModelo?: string;
  descricaoAtual?: string;
  onAplicar: (novaDescricao: string) => void;
  trigger?: React.ReactNode;
}

export function AiDescriberModal({
  nomeProduto,
  codigoModelo,
  descricaoAtual,
  onAplicar,
  trigger,
}: AiDescriberModalProps) {
  const [open, setOpen] = useState(false);
  const [tipoTecido, setTipoTecido] = useState<TipoTecidoIA>(() =>
    detectarTipoTecido(nomeProduto, codigoModelo),
  );
  const [tomVoz, setTomVoz] = useState<TomVozIA>("ceo_autoridade");
  const [destacarMargemLucro, setDestacarMargemLucro] = useState(true);
  const [destacarToqueSensorial, setDestacarToqueSensorial] = useState(true);
  const [destacarPreEncolhimento, setDestacarPreEncolhimento] = useState(true);
  const [textoGerado, setTextoGerado] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    if (open) {
      const detectado = detectarTipoTecido(nomeProduto, codigoModelo);
      setTipoTecido(detectado);
      gerarTexto(detectado);
    }
  }, [open, nomeProduto, codigoModelo]);

  function gerarTexto(tecidoOverride?: TipoTecidoIA) {
    setGerando(true);
    setTimeout(() => {
      const resultado = gerarDescricaoIA({
        nomeProduto: nomeProduto || "Produto Líder Atacado",
        codigoModelo,
        tipoTecido: tecidoOverride || tipoTecido,
        tomVoz,
        destacarMargemLucro,
        destacarToqueSensorial,
        destacarPreEncolhimento,
      });
      setTextoGerado(resultado);
      setGerando(false);
    }, 200);
  }

  function handleAplicar() {
    if (!textoGerado.trim()) {
      toast.error("Gere uma descrição antes de aplicar.");
      return;
    }
    onAplicar(textoGerado);
    toast.success("Descrição profissional com autoridade de CEO aplicada com sucesso!");
    setOpen(false);
  }

  function handleCopiar() {
    navigator.clipboard.writeText(textoGerado);
    toast.success("Descrição copiada para a área de transferência!");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 border-primary/50 text-primary hover:bg-primary/10 font-semibold cursor-pointer"
        >
          <Sparkles className="size-3.5 text-primary animate-pulse" />
          <span>Gerar Descrição com IA (Padrão CEO)</span>
        </Button>
      )}

      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
            <Wand2 className="size-3.5" />
            <span>Assistente de Copywriting IA</span>
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            Gerador de Descrição com Autoridade de CEO
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Crie descrições altamente persuasivas e técnicas para lojistas e revendedores, valorizando a qualidade da malha peruana, piquet duplo, durabilidade e margens de lucro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Parâmetros do Gerador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Malha / Categoria:</Label>
              <select
                value={tipoTecido}
                onChange={(e) => {
                  const val = e.target.value as TipoTecidoIA;
                  setTipoTecido(val);
                  gerarTexto(val);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-2xs"
              >
                <option value="cotton_pima">Cotton Pima Peruano 100% (Toque de Seda)</option>
                <option value="piquet_duplo">Polo Peruana Piquet Duplo (Gola Estruturada)</option>
                <option value="plus_size">Linha Especial Plus Size (G1 e G2)</option>
                <option value="basica_premium">Camiseta Básica Premium Penteada</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tom de Voz da IA:</Label>
              <select
                value={tomVoz}
                onChange={(e) => {
                  const val = e.target.value as TomVozIA;
                  setTomVoz(val);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-2xs"
              >
                <option value="ceo_autoridade">Autoridade de CEO & Alta Conversão</option>
                <option value="luxo_boutique">Padrão Luxo Boutique de Shopping</option>
                <option value="comercial_giro">Comercial de Alto Giro & Revenda Rápida</option>
              </select>
            </div>

            {/* Destaques Específicos */}
            <div className="sm:col-span-2 pt-1 flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={destacarMargemLucro}
                  onChange={(e) => setDestacarMargemLucro(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Enfatizar lucro 100%+</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={destacarToqueSensorial}
                  onChange={(e) => setDestacarToqueSensorial(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Enfatizar toque sensorial de seda</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={destacarPreEncolhimento}
                  onChange={(e) => setDestacarPreEncolhimento(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                <span>Zero encolhimento e torção</span>
              </label>
            </div>

            <div className="sm:col-span-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => gerarTexto()}
                disabled={gerando}
                className="w-full gap-1.5 font-bold"
              >
                <RefreshCw className={`size-3.5 ${gerando ? "animate-spin" : ""}`} />
                <span>Atualizar Texto Gerado</span>
              </Button>
            </div>
          </div>

          {/* Área de Visualização e Edição */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-foreground">
                  Prévia da Descrição Gerada:
                </Label>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                    textoGerado.length > 750
                      ? "bg-destructive/15 text-destructive font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {textoGerado.length} / 750 caracteres
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopiar}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Copy className="size-3" /> Copiar texto
              </button>
            </div>

            <Textarea
              value={textoGerado}
              onChange={(e) => setTextoGerado(e.target.value)}
              rows={10}
              className="font-sans text-xs leading-relaxed"
              placeholder="O texto gerado pela IA aparecerá aqui..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAplicar}
              className="gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Check className="size-4" />
              <span>Aplicar no Produto</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
