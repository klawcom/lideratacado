import { useState, useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import {
  REACTION_CONFIGS,
  obterContagensProduto,
  alternarReacaoUsuario,
  type ReactionType,
} from "@/lib/product-reactions";

interface ProductReactionsProps {
  produtoId: string;
  produtoNome?: string;
  className?: string;
}

export function ProductReactions({
  produtoId,
  produtoNome,
  className = "",
}: ProductReactionsProps) {
  const [data, setData] = useState(() => obterContagensProduto(produtoId));
  const [animatingId, setAnimatingId] = useState<ReactionType | null>(null);

  useEffect(() => {
    setData(obterContagensProduto(produtoId));
  }, [produtoId]);

  function handleReagir(id: ReactionType) {
    const eraMesma = data.reacaoUsuario === id;
    const proximo = alternarReacaoUsuario(produtoId, id);
    setData(proximo);
    setAnimatingId(id);
    setTimeout(() => setAnimatingId(null), 400);

    if (eraMesma) {
      toast.info("Sua reação foi removida.");
    } else {
      const config = REACTION_CONFIGS.find((r) => r.id === id);
      toast.success(
        `Você reagiu com ${config?.emoji} (${config?.label})! Obrigado pela sua opinião.`,
      );
    }
  }

  return (
    <section
      aria-label="Reações ao produto"
      className={`rounded-2xl border bg-card/60 backdrop-blur-xs p-3.5 sm:p-4 shadow-2xs ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>O que achou desta peça? Reaja com um emoji:</span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {data.total} reações de lojistas
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
        {REACTION_CONFIGS.map((config) => {
          const count = data.contagens[config.id];
          const isSelected = data.reacaoUsuario === config.id;
          const isAnimating = animatingId === config.id;

          return (
            <button
              key={config.id}
              type="button"
              onClick={() => handleReagir(config.id)}
              aria-label={`Reagir com ${config.label} (${config.emoji}): ${count} reações`}
              aria-pressed={isSelected}
              title={`${config.label} - ${config.descricao}`}
              className={`group relative flex min-h-[58px] sm:min-h-[64px] flex-col items-center justify-center rounded-xl border p-1 sm:p-1.5 transition-all duration-200 cursor-pointer select-none ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20 scale-[1.03]"
                  : "border-border/70 bg-background hover:border-primary/50 hover:bg-muted/40 active:scale-95"
              } ${isAnimating ? "animate-bounce" : ""}`}
            >
              {isSelected && (
                <span className="absolute -top-1.5 -right-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground text-[9px] shadow-xs">
                  <Check className="size-2.5 stroke-[3]" />
                </span>
              )}

              <span className="text-xl sm:text-2xl transition-transform duration-200 group-hover:scale-125">
                {config.emoji}
              </span>

              <span className="mt-0.5 text-[11px] font-bold tabular-nums text-foreground">
                {count}
              </span>

              <span
                className={`text-[10px] leading-none transition-colors truncate max-w-full ${
                  isSelected
                    ? "font-bold text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      {data.reacaoUsuario && (
        <p className="mt-2 text-center text-[11px] text-primary font-medium">
          ✓ Você reagiu a este modelo. Toque no mesmo emoji se quiser desmarcar.
        </p>
      )}
    </section>
  );
}
