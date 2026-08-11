CREATE OR REPLACE FUNCTION public.bloquear_troca_tipo_categoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_usos int;
BEGIN
  IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    SELECT
      (SELECT count(*) FROM public.conta_pagar WHERE categoria_id = OLD.id)
      + (SELECT count(*) FROM public.conta_receber WHERE categoria_id = OLD.id)
      + (SELECT count(*) FROM public.produto WHERE categoria_id = OLD.id)
    INTO v_usos;

    IF v_usos > 0 THEN
      RAISE EXCEPTION 'O tipo desta categoria não pode ser alterado porque ela já está em uso em % lançamento(s). Crie uma nova categoria se precisar de outro tipo.', v_usos;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bloquear_troca_tipo_categoria ON public.categoria;
CREATE TRIGGER trg_bloquear_troca_tipo_categoria
BEFORE UPDATE ON public.categoria
FOR EACH ROW EXECUTE FUNCTION public.bloquear_troca_tipo_categoria();