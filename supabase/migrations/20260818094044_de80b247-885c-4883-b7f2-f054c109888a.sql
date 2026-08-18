CREATE TABLE public.extrato_saldo_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  conta_bancaria_id uuid NOT NULL REFERENCES public.conta_bancaria(id) ON DELETE CASCADE,
  data date NOT NULL,
  saldo_extrato numeric NOT NULL DEFAULT 0,
  observacao text,
  revisado boolean NOT NULL DEFAULT false,
  revisado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conta_bancaria_id, data)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extrato_saldo_diario TO authenticated;
GRANT ALL ON public.extrato_saldo_diario TO service_role;

ALTER TABLE public.extrato_saldo_diario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extrato por empresa" ON public.extrato_saldo_diario
  FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id))
  WITH CHECK (public.pertence_empresa(empresa_id));

CREATE INDEX idx_extrato_conta_data ON public.extrato_saldo_diario (conta_bancaria_id, data DESC);