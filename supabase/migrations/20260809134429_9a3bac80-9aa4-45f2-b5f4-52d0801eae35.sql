
REVOKE ALL ON FUNCTION public.registrar_auditoria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aplicar_movimento_estoque() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pertence_empresa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_consolidar() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_admin_empresa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.usuarios_da_empresa() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.meus_papeis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pertence_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_consolidar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_admin_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuarios_da_empresa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.meus_papeis() TO authenticated;
