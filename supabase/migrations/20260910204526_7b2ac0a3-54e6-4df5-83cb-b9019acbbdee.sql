CREATE OR REPLACE FUNCTION public.aplicar_convite_existente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF v_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuario_empresa
    WHERE user_id = v_user AND empresa_id = NEW.empresa_id
  ) THEN
    INSERT INTO public.usuario_empresa (user_id, empresa_id, papel, pode_ver_consolidado)
    VALUES (v_user, NEW.empresa_id, NEW.papel, NEW.pode_ver_consolidado);
  ELSE
    UPDATE public.usuario_empresa
       SET papel = NEW.papel, pode_ver_consolidado = NEW.pode_ver_consolidado
     WHERE user_id = v_user AND empresa_id = NEW.empresa_id;
  END IF;

  UPDATE public.convite
     SET status = 'aceito', aceito_em = now()
   WHERE id = NEW.id;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_aplicar_convite_existente ON public.convite;
CREATE TRIGGER trg_aplicar_convite_existente
AFTER INSERT ON public.convite
FOR EACH ROW EXECUTE FUNCTION public.aplicar_convite_existente();

-- Backfill: convites pendentes de usuarios que ja criaram conta
INSERT INTO public.usuario_empresa (user_id, empresa_id, papel, pode_ver_consolidado)
SELECT u.id, c.empresa_id, c.papel, c.pode_ver_consolidado
FROM public.convite c
JOIN auth.users u ON lower(u.email) = lower(c.email)
WHERE c.status = 'pendente'
  AND NOT EXISTS (
    SELECT 1 FROM public.usuario_empresa ue
    WHERE ue.user_id = u.id AND ue.empresa_id = c.empresa_id
  );

UPDATE public.convite c
   SET status = 'aceito', aceito_em = now()
  FROM auth.users u
 WHERE lower(u.email) = lower(c.email) AND c.status = 'pendente';