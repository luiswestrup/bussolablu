CREATE TABLE public.extrato_bancario_linha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  conta_bancaria_id uuid NOT NULL REFERENCES public.conta_bancaria(id) ON DELETE CASCADE,
  data date NOT NULL,
  valor numeric NOT NULL,
  descricao text,
  fitid text,
  hash text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','conciliado','ignorado')),
  conta_pagar_id uuid REFERENCES public.conta_pagar(id) ON DELETE SET NULL,
  conta_receber_id uuid REFERENCES public.conta_receber(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extrato_bancario_linha TO authenticated;
GRANT ALL ON public.extrato_bancario_linha TO service_role;

ALTER TABLE public.extrato_bancario_linha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros da empresa gerenciam linhas do extrato"
ON public.extrato_bancario_linha FOR ALL TO authenticated
USING (public.pertence_empresa(empresa_id))
WITH CHECK (public.pertence_empresa(empresa_id));

CREATE UNIQUE INDEX extrato_linha_unica ON public.extrato_bancario_linha (conta_bancaria_id, hash);
CREATE INDEX extrato_linha_conta_data ON public.extrato_bancario_linha (conta_bancaria_id, data);

CREATE TRIGGER trg_extrato_bancario_linha_updated
BEFORE UPDATE ON public.extrato_bancario_linha
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();