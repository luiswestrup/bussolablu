CREATE TABLE public.recebimento_planilha_importado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  aba text NOT NULL,
  linha_numero integer NOT NULL,
  hash_conteudo text NOT NULL,
  conta_receber_id uuid REFERENCES public.conta_receber(id) ON DELETE SET NULL,
  ignorado boolean NOT NULL DEFAULT false,
  importado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, aba, linha_numero)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_planilha_importado TO authenticated;
GRANT ALL ON public.recebimento_planilha_importado TO service_role;

ALTER TABLE public.recebimento_planilha_importado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recebimento_planilha_importado por empresa"
ON public.recebimento_planilha_importado
FOR ALL TO authenticated
USING (public.pertence_empresa(empresa_id))
WITH CHECK (public.pertence_empresa(empresa_id));