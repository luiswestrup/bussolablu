ALTER TABLE public.extrato_bancario_linha
  ADD COLUMN IF NOT EXISTS transferencia_bancaria_id uuid
  REFERENCES public.transferencia_bancaria(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_extrato_linha_transferencia
  ON public.extrato_bancario_linha(transferencia_bancaria_id);

ALTER TABLE public.transferencia_bancaria
  ADD COLUMN IF NOT EXISTS conciliado_origem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conciliado_origem_em timestamptz,
  ADD COLUMN IF NOT EXISTS conciliado_destino boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conciliado_destino_em timestamptz;