ALTER TABLE public.conta_pagar
  ADD COLUMN IF NOT EXISTS conciliado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conciliado_em timestamp with time zone;

ALTER TABLE public.conta_receber
  ADD COLUMN IF NOT EXISTS conciliado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conciliado_em timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_conta_pagar_conciliacao ON public.conta_pagar (empresa_id, conta_bancaria_id, conciliado);
CREATE INDEX IF NOT EXISTS idx_conta_receber_conciliacao ON public.conta_receber (empresa_id, conta_bancaria_id, conciliado);