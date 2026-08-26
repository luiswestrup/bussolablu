CREATE TABLE public.historico_edicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  tabela_origem text NOT NULL CHECK (tabela_origem IN ('conta_pagar','conta_receber')),
  registro_id uuid NOT NULL,
  campo_alterado text NOT NULL,
  valor_anterior text,
  valor_novo text,
  usuario_id uuid DEFAULT auth.uid(),
  editado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_historico_edicoes_registro ON public.historico_edicoes (tabela_origem, registro_id, editado_em DESC);

GRANT SELECT, INSERT ON public.historico_edicoes TO authenticated;
GRANT ALL ON public.historico_edicoes TO service_role;

ALTER TABLE public.historico_edicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver historico" ON public.historico_edicoes
FOR SELECT TO authenticated
USING (public.pertence_empresa(empresa_id));

CREATE POLICY "Empresa pode registrar historico" ON public.historico_edicoes
FOR INSERT TO authenticated
WITH CHECK (public.pertence_empresa(empresa_id) AND usuario_id = auth.uid());