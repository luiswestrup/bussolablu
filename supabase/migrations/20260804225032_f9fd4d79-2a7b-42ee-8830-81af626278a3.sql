REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aplicar_movimento_estoque() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pertence_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pertence_empresa(uuid) TO authenticated;