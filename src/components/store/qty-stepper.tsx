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
    <div className={cn("flex items-center justify-between gap-2 rounded-xl border bg-card", compact ? "p-1 pl-2.5" : "p-1.5 pl-3")}>
      <span className="font-sans text-xs sm:text-sm font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          aria-label={`Diminuir ${label}`}
          className="grid size-7 sm:size-8 place-items-center rounded-lg bg-secondary text-foreground transition active:scale-95 disabled:opacity-30 hover:bg-secondary/80"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={`Quantidade ${label}`}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))}
          className="w-8 text-center text-xs sm:text-sm font-semibold tabular-nums outline-none bg-transparent"
        />
        <button
          type="button"
          onClick={() => set(value + 1)}
          aria-label={`Aumentar ${label}`}
          className="grid size-7 sm:size-8 place-items-center rounded-lg bg-[#14532D] text-white transition active:scale-95 hover:bg-[#0F3F24]"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
