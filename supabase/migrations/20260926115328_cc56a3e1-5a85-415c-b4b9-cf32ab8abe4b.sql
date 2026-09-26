ALTER TABLE public.conta_bancaria
  ADD COLUMN IF NOT EXISTS conta_espelho_id uuid REFERENCES public.conta_bancaria(id) ON DELETE SET NULL;

ALTER TABLE public.transferencia_bancaria
  ADD COLUMN IF NOT EXISTS conta_pagar_id uuid REFERENCES public.conta_pagar(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS grupo_intercompany uuid;

CREATE INDEX IF NOT EXISTS idx_transferencia_conta_pagar ON public.transferencia_bancaria(conta_pagar_id);
CREATE INDEX IF NOT EXISTS idx_transferencia_grupo_intercompany ON public.transferencia_bancaria(grupo_intercompany);