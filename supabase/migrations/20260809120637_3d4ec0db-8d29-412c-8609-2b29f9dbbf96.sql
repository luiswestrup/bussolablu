CREATE TABLE public.nota_fiscal_importada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  chave_acesso text NOT NULL,
  fornecedor_id uuid REFERENCES public.fornecedor(id) ON DELETE SET NULL,
  numero_nota text,
  data_emissao date,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'importada',
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, chave_acesso)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nota_fiscal_importada TO authenticated;
GRANT ALL ON public.nota_fiscal_importada TO service_role;
ALTER TABLE public.nota_fiscal_importada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nota_fiscal_importada por empresa" ON public.nota_fiscal_importada
  FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id))
  WITH CHECK (public.pertence_empresa(empresa_id));

CREATE TABLE public.produto_fornecedor_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES public.fornecedor(id) ON DELETE CASCADE,
  codigo_produto_fornecedor text NOT NULL,
  produto_id uuid NOT NULL REFERENCES public.produto(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, fornecedor_id, codigo_produto_fornecedor)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedor_map TO authenticated;
GRANT ALL ON public.produto_fornecedor_map TO service_role;
ALTER TABLE public.produto_fornecedor_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produto_fornecedor_map por empresa" ON public.produto_fornecedor_map
  FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id))
  WITH CHECK (public.pertence_empresa(empresa_id));

ALTER TABLE public.conta_pagar ADD COLUMN IF NOT EXISTS vencimento_estimado boolean NOT NULL DEFAULT false;