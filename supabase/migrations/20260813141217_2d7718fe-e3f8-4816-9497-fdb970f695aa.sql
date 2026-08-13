CREATE TABLE public.transferencia_bancaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id),
  conta_origem_id uuid NOT NULL REFERENCES public.conta_bancaria(id),
  conta_destino_id uuid NOT NULL REFERENCES public.conta_bancaria(id),
  valor numeric NOT NULL CHECK (valor > 0),
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contas_diferentes CHECK (conta_origem_id <> conta_destino_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transferencia_bancaria TO authenticated;
GRANT ALL ON public.transferencia_bancaria TO service_role;

ALTER TABLE public.transferencia_bancaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transferencia por empresa" ON public.transferencia_bancaria
FOR ALL TO authenticated
USING (public.pertence_empresa(empresa_id))
WITH CHECK (public.pertence_empresa(empresa_id));

CREATE OR REPLACE FUNCTION public.validar_transferencia_bancaria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.conta_bancaria cb WHERE cb.id = NEW.conta_origem_id AND cb.empresa_id = NEW.empresa_id) THEN
    RAISE EXCEPTION 'A conta de origem não pertence à empresa da transferência.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conta_bancaria cb WHERE cb.id = NEW.conta_destino_id AND cb.empresa_id = NEW.empresa_id) THEN
    RAISE EXCEPTION 'A conta de destino não pertence à empresa da transferência.';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validar_transferencia_bancaria
BEFORE INSERT OR UPDATE ON public.transferencia_bancaria
FOR EACH ROW EXECUTE FUNCTION public.validar_transferencia_bancaria();

CREATE TRIGGER trg_transferencia_bancaria_updated
BEFORE UPDATE ON public.transferencia_bancaria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();