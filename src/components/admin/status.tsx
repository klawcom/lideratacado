import type { Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export type PedidoStatus = Enums<"pedido_status">;
export const STATUS: { value: PedidoStatus; label: string }[] = [
  { value: "novo", label: "Novo" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "pago", label: "Pago" },
  { value: "enviado", label: "Enviado" },
  { value: "cancelado", label: "Cancelado" },
];
export const statusLabel = (s: string) => STATUS.find((x) => x.value === s)?.label ?? s;

const STYLE: Record<PedidoStatus, string> = {
  novo: "bg-primary text-primary-foreground",
  em_atendimento: "bg-accent text-accent-foreground",
  pago: "bg-success/15 text-success",
  enviado: "bg-secondary text-secondary-foreground border",
  cancelado: "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status }: { status: PedidoStatus }) {
  return <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-sm font-semibold", STYLE[status])}>{statusLabel(status)}</span>;
}
