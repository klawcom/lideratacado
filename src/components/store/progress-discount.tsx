import { CheckCircle2, Sparkles, TrendingDown } from "lucide-react";
import { FAIXAS, type FaixaQtd, type Resumo, type LinhaEntrada } from "@/lib/pricing";
import { faltamPecas } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProgressDiscountProps {
  totalPecas: number;
  pedidoMinimo?: number;
  proxima?: { faixa: FaixaQtd; faltam: number } | null;
  faixaAtual?: FaixaQtd;
  compact?: boolean;
  className?: string;
}

export function ProgressDiscount({
  totalPecas,
  pedidoMinimo = 10,
  proxima,
  faixaAtual = 10,
  compact = false,
  className,
}: ProgressDiscountProps) {
  const faltamMinimo = Math.max(0, pedidoMinimo - totalPecas);
  const atingiuMinimo = faltamMinimo === 0;
  const atingiuMaximo = totalPecas >= 50;

  // Calcula o progresso para a barra contínua (0 a 100%)
  // 0 -> 0%, 10 -> 25%, 20 -> 50%, 30 -> 75%, 50+ -> 100%
  let percentual = 0;
  if (totalPecas <= 10) {
    percentual = (totalPecas / 10) * 25;
  } else if (totalPecas <= 20) {
    percentual = 25 + ((totalPecas - 10) / 10) * 25;
  } else if (totalPecas <= 30) {
    percentual = 50 + ((totalPecas - 20) / 10) * 25;
  } else if (totalPecas <= 50) {
    percentual = 75 + ((totalPecas - 30) / 20) * 25;
  } else {
    percentual = 100;
  }
  percentual = Math.min(100, Math.max(0, percentual));

  if (compact) {
    return (
      <div className={cn("rounded-xl border bg-card p-3 shadow-2xs", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            {atingiuMinimo ? `${totalPecas} peças no pedido` : `Faltam ${faltamMinimo} peças`}
          </span>
          <span className="text-muted-foreground font-medium">
            {atingiuMaximo
              ? "Faixa máxima (50+ un)"
              : proxima
                ? `Próxima: ${proxima.faixa} un`
                : "Mínimo: 10 un"}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              atingiuMaximo
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-primary"
            )}
            style={{ width: `${percentual}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 sm:p-5 shadow-2xs space-y-4",
        atingiuMaximo && "border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10",
        className
      )}
    >
      {/* Cabeçalho do progresso */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-xs font-bold",
                atingiuMaximo
                  ? "bg-emerald-500 text-white"
                  : atingiuMinimo
                    ? "bg-primary text-primary-foreground"
                    : "bg-destructive/10 text-destructive"
              )}
            >
              {atingiuMaximo ? "✓" : totalPecas}
            </span>
            <h3 className="font-sans text-sm sm:text-base font-bold text-foreground">
              {atingiuMaximo
                ? "Faixa máxima de desconto alcançada!"
                : atingiuMinimo
                  ? `Faixa ativa: a partir de ${faixaAtual} peças`
                  : `Faltam ${faltamPecas(faltamMinimo)} para o pedido mínimo`}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {atingiuMaximo
              ? "Você garantiu o menor preço unitário por peça em todos os itens do seu pedido."
              : proxima && atingiuMinimo
                ? `Adicione mais ${proxima.faltam} ${proxima.faltam === 1 ? "peça" : "peças"} para desbloquear a faixa de ${proxima.faixa} peças e baratear todos os itens!`
                : `O pedido mínimo para compras no atacado é de ${pedidoMinimo} peças variadas.`}
          </p>
        </div>

        {proxima && atingiuMinimo && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
            <TrendingDown className="size-3.5" /> +{proxima.faltam} un
          </span>
        )}
      </div>

      {/* Barra de progresso com marcos visuais */}
      <div className="space-y-2">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              atingiuMaximo
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-primary to-emerald-600"
            )}
            style={{ width: `${percentual}%` }}
          />
        </div>

        {/* Marcadores das faixas */}
        <div className="grid grid-cols-4 text-center pt-1 text-[11px]">
          {FAIXAS.map((faixa) => {
            const alcancada = totalPecas >= faixa;
            return (
              <div key={faixa} className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full text-[9px] font-bold transition-all",
                    alcancada
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {alcancada ? "✓" : faixa}
                </span>
                <span
                  className={cn(
                    "mt-1 font-medium truncate max-w-full",
                    alcancada ? "text-foreground font-bold" : "text-muted-foreground/80"
                  )}
                >
                  {faixa} peças
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
