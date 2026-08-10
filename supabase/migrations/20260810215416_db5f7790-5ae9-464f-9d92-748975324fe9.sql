ALTER TABLE public.conta_pagar
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS parcela text,
  ADD COLUMN IF NOT EXISTS valor_pago numeric,
  ADD COLUMN IF NOT EXISTS valor_desconto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_multa_juros numeric NOT NULL DEFAULT 0;

ALTER TABLE public.conta_receber
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS parcela text,
  ADD COLUMN IF NOT EXISTS valor_recebido numeric,
  ADD COLUMN IF NOT EXISTS valor_desconto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_multa_juros numeric NOT NULL DEFAULT 0;