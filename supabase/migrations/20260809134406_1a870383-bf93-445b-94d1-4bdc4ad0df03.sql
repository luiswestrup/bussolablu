
-- helpers
CREATE OR REPLACE FUNCTION public.e_admin_empresa(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_empresa ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = _empresa_id AND ue.papel = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.e_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_empresa ue
    WHERE ue.user_id = auth.uid() AND ue.papel = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.e_admin_empresa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.e_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.e_admin_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.e_admin() TO authenticated;

-- auditoria
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acao_auditoria') THEN
    CREATE TYPE public.acao_auditoria AS ENUM ('criado','editado','excluido');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  usuario_id uuid,
  tabela_afetada text NOT NULL,
  registro_id uuid,
  acao public.acao_auditoria NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auditoria TO authenticated;
GRANT ALL ON public.auditoria TO service_role;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin ve auditoria da empresa" ON public.auditoria;
CREATE POLICY "admin ve auditoria da empresa" ON public.auditoria
  FOR SELECT TO authenticated USING (public.e_admin_empresa(empresa_id));

CREATE INDEX IF NOT EXISTS idx_auditoria_empresa_data ON public.auditoria (empresa_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela ON public.auditoria (tabela_afetada);

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_acao public.acao_auditoria;
  v_reg uuid;
  v_ant jsonb;
  v_novo jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criado'; v_empresa := NEW.empresa_id; v_reg := NEW.id;
    v_novo := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'editado'; v_empresa := NEW.empresa_id; v_reg := NEW.id;
    v_ant := to_jsonb(OLD); v_novo := to_jsonb(NEW);
    IF v_ant = v_novo THEN RETURN NEW; END IF;
  ELSE
    v_acao := 'excluido'; v_empresa := OLD.empresa_id; v_reg := OLD.id;
    v_ant := to_jsonb(OLD);
  END IF;

  INSERT INTO public.auditoria (empresa_id, usuario_id, tabela_afetada, registro_id, acao, dados_anteriores, dados_novos)
  VALUES (v_empresa, auth.uid(), TG_TABLE_NAME, v_reg, v_acao, v_ant, v_novo);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auditoria_conta_pagar ON public.conta_pagar;
CREATE TRIGGER trg_auditoria_conta_pagar AFTER INSERT OR UPDATE OR DELETE ON public.conta_pagar
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
DROP TRIGGER IF EXISTS trg_auditoria_conta_receber ON public.conta_receber;
CREATE TRIGGER trg_auditoria_conta_receber AFTER INSERT OR UPDATE OR DELETE ON public.conta_receber
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
DROP TRIGGER IF EXISTS trg_auditoria_produto ON public.produto;
CREATE TRIGGER trg_auditoria_produto AFTER INSERT OR UPDATE OR DELETE ON public.produto
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();
DROP TRIGGER IF EXISTS trg_auditoria_movimento_estoque ON public.movimento_estoque;
CREATE TRIGGER trg_auditoria_movimento_estoque AFTER INSERT OR UPDATE OR DELETE ON public.movimento_estoque
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria();

-- convites
CREATE TABLE IF NOT EXISTS public.convite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  email text NOT NULL,
  papel public.papel_usuario NOT NULL DEFAULT 'financeiro',
  pode_ver_consolidado boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendente',
  convidado_por uuid,
  aceito_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.convite TO authenticated;
GRANT ALL ON public.convite TO service_role;
ALTER TABLE public.convite ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin gerencia convites" ON public.convite;
CREATE POLICY "admin gerencia convites" ON public.convite
  FOR ALL TO authenticated
  USING (public.e_admin_empresa(empresa_id))
  WITH CHECK (public.e_admin_empresa(empresa_id));

-- admins gerenciam vinculos de usuarios das suas empresas
DROP POLICY IF EXISTS "admin ve vinculos da empresa" ON public.usuario_empresa;
CREATE POLICY "admin ve vinculos da empresa" ON public.usuario_empresa
  FOR SELECT TO authenticated USING (public.e_admin_empresa(empresa_id));
DROP POLICY IF EXISTS "admin altera vinculos da empresa" ON public.usuario_empresa;
CREATE POLICY "admin altera vinculos da empresa" ON public.usuario_empresa
  FOR UPDATE TO authenticated
  USING (public.e_admin_empresa(empresa_id))
  WITH CHECK (public.e_admin_empresa(empresa_id));
DROP POLICY IF EXISTS "admin remove vinculos da empresa" ON public.usuario_empresa;
CREATE POLICY "admin remove vinculos da empresa" ON public.usuario_empresa
  FOR DELETE TO authenticated USING (public.e_admin_empresa(empresa_id) AND user_id <> auth.uid());

-- novo usuario: aplica convites; primeiro usuario do sistema vira admin de tudo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_qtd int;
BEGIN
  INSERT INTO public.usuario_empresa (user_id, empresa_id, papel, pode_ver_consolidado)
  SELECT NEW.id, c.empresa_id, c.papel, c.pode_ver_consolidado
  FROM public.convite c
  WHERE lower(c.email) = lower(NEW.email) AND c.status = 'pendente'
  ON CONFLICT DO NOTHING;

  UPDATE public.convite SET status = 'aceito', aceito_em = now()
  WHERE lower(email) = lower(NEW.email) AND status = 'pendente';

  SELECT count(*) INTO v_qtd FROM public.usuario_empresa WHERE user_id = NEW.id;
  IF v_qtd = 0 AND NOT EXISTS (SELECT 1 FROM public.usuario_empresa) THEN
    INSERT INTO public.usuario_empresa (user_id, empresa_id, papel, pode_ver_consolidado)
    SELECT NEW.id, e.id, 'admin', true FROM public.empresa e
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

-- lista de usuarios visivel ao admin (email vem de auth.users)
CREATE OR REPLACE FUNCTION public.usuarios_da_empresa()
RETURNS TABLE (
  vinculo_id uuid,
  user_id uuid,
  email text,
  empresa_id uuid,
  papel public.papel_usuario,
  pode_ver_consolidado boolean,
  criado_em timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ue.id, ue.user_id, u.email::text, ue.empresa_id, ue.papel, ue.pode_ver_consolidado, ue.criado_em
  FROM public.usuario_empresa ue
  JOIN auth.users u ON u.id = ue.user_id
  WHERE public.e_admin_empresa(ue.empresa_id)
  ORDER BY u.email;
$$;

REVOKE ALL ON FUNCTION public.usuarios_da_empresa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuarios_da_empresa() TO authenticated;

-- papeis do usuario logado
CREATE OR REPLACE FUNCTION public.meus_papeis()
RETURNS TABLE (empresa_id uuid, papel public.papel_usuario)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ue.empresa_id, ue.papel FROM public.usuario_empresa ue WHERE ue.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.meus_papeis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meus_papeis() TO authenticated;
