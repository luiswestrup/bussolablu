CREATE TYPE public.natureza_categoria AS ENUM ('mercadoria','servico','outro');

ALTER TABLE public.categoria ADD COLUMN natureza public.natureza_categoria;

CREATE TABLE public.conta_bancaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  banco text NOT NULL,
  agencia text,
  conta text,
  tipo text NOT NULL DEFAULT 'corrente',
  saldo_inicial numeric NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conta_bancaria TO authenticated;
GRANT ALL ON public.conta_bancaria TO service_role;

ALTER TABLE public.conta_bancaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conta_bancaria por empresa" ON public.conta_bancaria
  FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id))
  WITH CHECK (public.pertence_empresa(empresa_id));

CREATE TRIGGER trg_conta_bancaria_updated BEFORE UPDATE ON public.conta_bancaria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.conta_pagar ADD COLUMN conta_bancaria_id uuid REFERENCES public.conta_bancaria(id) ON DELETE SET NULL;
ALTER TABLE public.conta_receber ADD COLUMN conta_bancaria_id uuid REFERENCES public.conta_bancaria(id) ON DELETE SET NULL;