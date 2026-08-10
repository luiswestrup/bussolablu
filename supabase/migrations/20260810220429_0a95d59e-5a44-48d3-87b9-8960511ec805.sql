CREATE TABLE public.natureza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.natureza TO authenticated;
GRANT ALL ON public.natureza TO service_role;

ALTER TABLE public.natureza ENABLE ROW LEVEL SECURITY;

CREATE POLICY "natureza por empresa" ON public.natureza
  FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id))
  WITH CHECK (public.pertence_empresa(empresa_id));

CREATE TRIGGER trg_natureza_updated BEFORE UPDATE ON public.natureza
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.natureza (empresa_id, nome)
SELECT e.id, n.nome
FROM public.empresa e
CROSS JOIN (VALUES ('Mercadoria'), ('Serviço'), ('Outro')) AS n(nome)
ON CONFLICT DO NOTHING;

ALTER TABLE public.categoria
  ADD COLUMN natureza_id uuid REFERENCES public.natureza(id) ON DELETE RESTRICT;

UPDATE public.categoria c
SET natureza_id = n.id
FROM public.natureza n
WHERE n.empresa_id = c.empresa_id
  AND n.nome = CASE c.natureza::text
    WHEN 'mercadoria' THEN 'Mercadoria'
    WHEN 'servico' THEN 'Serviço'
    WHEN 'outro' THEN 'Outro'
  END;

ALTER TABLE public.categoria DROP COLUMN natureza;

CREATE INDEX idx_categoria_natureza_id ON public.categoria(natureza_id);
