ALTER TABLE public.usuario_empresa
  ADD COLUMN IF NOT EXISTS pode_ver_consolidado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.pode_consolidar()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_empresa ue
    WHERE ue.user_id = auth.uid()
      AND ue.pode_ver_consolidado
  );
$$;

REVOKE ALL ON FUNCTION public.pode_consolidar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_consolidar() TO authenticated;

UPDATE public.usuario_empresa ue
SET pode_ver_consolidado = true
WHERE ue.papel = 'admin';