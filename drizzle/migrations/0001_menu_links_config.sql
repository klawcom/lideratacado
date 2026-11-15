ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS menu_links jsonb NOT NULL DEFAULT '[
    {"to":"/como-comprar","label":"Como comprar","visivel":true},
    {"to":"/sobre","label":"Sobre","visivel":true},
    {"to":"/faq","label":"Dúvidas frequentes","visivel":true},
    {"to":"/trocas-e-devolucoes","label":"Trocas e devoluções","visivel":true},
    {"to":"/privacidade","label":"Política de privacidade","visivel":true}
  ]'::jsonb;