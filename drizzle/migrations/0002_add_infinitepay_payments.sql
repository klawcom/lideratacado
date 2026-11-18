ALTER TABLE public.pedidos
  ADD COLUMN idempotency_key uuid UNIQUE,
  ADD COLUMN forma_pagamento text NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_forma_pagamento_check
  CHECK (forma_pagamento IN ('whatsapp', 'infinitepay'));

CREATE UNIQUE INDEX pedidos_idempotency_key_idx
  ON public.pedidos (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL UNIQUE REFERENCES public.pedidos(id),
  provedor text NOT NULL DEFAULT 'infinitepay' CHECK (provedor = 'infinitepay'),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'pago', 'falhou', 'cancelado', 'estornado', 'erro')),
  order_nsu text NOT NULL UNIQUE,
  invoice_slug text,
  transaction_nsu text,
  payment_url text,
  receipt_url text,
  amount integer NOT NULL CHECK (amount > 0),
  paid_amount integer CHECK (paid_amount IS NULL OR paid_amount >= 0),
  installments integer CHECK (installments IS NULL OR installments BETWEEN 1 AND 12),
  capture_method text CHECK (capture_method IS NULL OR capture_method IN ('pix', 'credit_card')),
  last_checked_at timestamptz,
  paid_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads payments"
  ON public.pagamentos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX pagamentos_transaction_nsu_idx
  ON public.pagamentos (transaction_nsu)
  WHERE transaction_nsu IS NOT NULL;

CREATE TRIGGER pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pagamento_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagamento_id uuid NOT NULL REFERENCES public.pagamentos(id) ON DELETE CASCADE,
  evento text NOT NULL,
  transaction_nsu text NOT NULL DEFAULT '',
  confirmado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pagamento_eventos TO authenticated;
GRANT ALL ON public.pagamento_eventos TO service_role;
ALTER TABLE public.pagamento_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads payment events"
  ON public.pagamento_eventos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX pagamento_eventos_idempotency_idx
  ON public.pagamento_eventos (pagamento_id, evento, transaction_nsu);