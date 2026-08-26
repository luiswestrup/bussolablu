ALTER TABLE public.conta_pagar
  ADD COLUMN IF NOT EXISTS numero_parcela integer,
  ADD COLUMN IF NOT EXISTS total_parcelas integer;

CREATE INDEX IF NOT EXISTS idx_conta_pagar_grupo_parcelamento
  ON public.conta_pagar (grupo_parcelamento_id);