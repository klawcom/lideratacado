import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, ExternalLink, Loader2, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, maskCep, onlyDigits } from "@/lib/format";
import { calcularPesoTotalKg, formatarPrazoFrete, type FreteOpcao, type ItemFrete } from "@/lib/frete";
import { simularFrete } from "@/lib/frete.functions";
import { lerDadosEntrega } from "@/lib/checkout-storage";
import { cn } from "@/lib/utils";

const CEP_STORAGE_KEY = "lider-simulacao-cep";

export function ShippingCalculator({
  itens,
  className,
  compact = false,
}: {
  itens: ItemFrete[];
  className?: string;
  compact?: boolean;
}) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [opcoes, setOpcoes] = useState<FreteOpcao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pesoCalculado, setPesoCalculado] = useState<number>(0);
  const simular = useServerFn(simularFrete);

  const totalPecas = itens.reduce((s, it) => s + it.pecas, 0);
  const pesoEstimado = calcularPesoTotalKg(itens);

  useEffect(() => {
    // Carrega último CEP usado pelo cliente
    const salvo = localStorage.getItem(CEP_STORAGE_KEY) || lerDadosEntrega()?.cep;
    if (salvo) {
      setCep(maskCep(salvo));
    }
  }, []);

  async function consultar(cepRaw?: string) {
    const cepAlvo = onlyDigits(cepRaw ?? cep);
    if (cepAlvo.length !== 8) {
      setErro("Informe um CEP válido com 8 dígitos.");
      return;
    }
    if (itens.length === 0 || totalPecas === 0) {
      setErro("Adicione peças para calcular o frete.");
      return;
    }

    setLoading(true);
    setErro(null);
    try {
      localStorage.setItem(CEP_STORAGE_KEY, cepAlvo);
      const res = await simular({
        data: {
          cepDestino: cepAlvo,
          itens,
        },
      });

      if (!res.sucesso) {
        setErro(res.mensagem || "Não foi possível cotar o frete para este CEP.");
        setOpcoes(null);
      } else {
        setOpcoes(res.opcoes);
        setPesoCalculado(res.pesoKg);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao consultar frete.");
      setOpcoes(null);
    } finally {
      setLoading(false);
    }
  }

  function handleCepChange(val: string) {
    const masked = maskCep(val);
    setCep(masked);
    setErro(null);
    if (onlyDigits(masked).length === 8) {
      consultar(masked);
    }
  }

  return (
    <div className={cn("rounded-2xl border bg-card/60 p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-emerald-700 dark:text-emerald-500" />
          <h3 className="font-sans text-sm font-semibold tracking-normal text-foreground">
            Simular frete e prazo
          </h3>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Consulte o valor e prazo estimado para o seu endereço:
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            className="h-10 text-sm font-mono tracking-wider"
            aria-label="CEP de entrega"
          />
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => consultar()}
          disabled={loading || onlyDigits(cep).length !== 8}
          className="h-10 px-4 shrink-0 font-medium bg-[#14532D] hover:bg-[#0F3F24] text-white"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground underline decoration-muted-foreground/50 underline-offset-2"
        >
          Não sei meu CEP <ExternalLink className="size-3" />
        </a>
      </div>

      {erro && (
        <p className="rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
          {erro}
        </p>
      )}

      {opcoes && opcoes.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/60">
          <p className="text-xs font-semibold text-foreground">
            Opções disponíveis para o CEP {cep}:
          </p>
          <div className="space-y-2">
            {opcoes.map((op) => (
              <div
                key={op.id}
                className="flex items-center justify-between rounded-xl border bg-background/80 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-[11px] text-primary">
                    {op.nome === "SEDEX" ? "SED" : "PAC"}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-foreground text-sm">{op.nome}</span>
                      <span className="text-muted-foreground">({op.transportadora})</span>
                    </div>
                    <p className="text-muted-foreground">{formatarPrazoFrete(op.prazoDias)}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-sm text-foreground tabular-nums">
                    {brl(op.preco)}
                  </span>
                  {op.desconto && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      com desconto SuperFrete
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground pt-1">
            ⚠️ <em>Valores e prazos aproximados. No fechamento pelo WhatsApp, confirmamos o frete mais vantajoso e também podemos cotar transportadoras parceiras.</em>
          </p>
        </div>
      )}
    </div>
  );
}
