import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  compact?: boolean;
}) {
  const set = (v: number) => onChange(Math.max(0, Math.min(99999, Math.floor(v) || 0)));
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-2xl border bg-card", compact ? "p-1.5 pl-4" : "p-2 pl-5")}>
      <span className={cn("font-display font-bold", compact ? "text-base" : "text-xl")}>{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          aria-label={`Diminuir ${label}`}
          className={cn("grid place-items-center rounded-xl bg-secondary transition active:scale-95 disabled:opacity-40", compact ? "size-11" : "size-12")}
        >
          <Minus className="size-5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantidade ${label}`}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
          className={cn("bg-transparent text-center font-semibold tabular-nums outline-none", compact ? "w-12 text-base" : "w-14 text-lg")}
        />
        <button
          type="button"
          onClick={() => set(value + 1)}
          aria-label={`Aumentar ${label}`}
          className={cn("grid place-items-center rounded-xl bg-primary text-primary-foreground transition active:scale-95", compact ? "size-11" : "size-12")}
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}
