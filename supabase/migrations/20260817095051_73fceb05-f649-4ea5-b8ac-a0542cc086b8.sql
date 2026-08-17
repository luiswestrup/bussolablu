CREATE TABLE public.taxa_recebimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  forma_recebimento text NOT NULL,
  percentual numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, forma_recebimento)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxa_recebimento TO authenticated;
GRANT ALL ON public.taxa_recebimento TO service_role;

ALTER TABLE public.taxa_recebimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxa_recebimento por empresa" ON public.taxa_recebimento
FOR ALL TO authenticated
USING (public.pertence_empresa(empresa_id))
WITH CHECK (public.pertence_empresa(empresa_id));

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_taxa_recebimento_atualizado
BEFORE UPDATE ON public.taxa_recebimento
FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

INSERT INTO public.taxa_recebimento (empresa_id, forma_recebimento, percentual)
SELECT e.id, f.nome, 0
FROM public.empresa e
CROSS JOIN (VALUES ('Pix'),('Débito'),('Crédito'),('Transferência'),('Boleto'),('Dinheiro'),('Cartão'),('Cheque')) AS f(nome)
ON CONFLICT (empresa_id, forma_recebimento) DO NOTHING;