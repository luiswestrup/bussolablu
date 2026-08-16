CREATE TABLE public.planilha_aba_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  gid text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, gid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planilha_aba_config TO authenticated;
GRANT ALL ON public.planilha_aba_config TO service_role;

ALTER TABLE public.planilha_aba_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planilha_aba_config por empresa" ON public.planilha_aba_config
  FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id))
  WITH CHECK (public.pertence_empresa(empresa_id));

CREATE TRIGGER trg_planilha_aba_config_updated
  BEFORE UPDATE ON public.planilha_aba_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();