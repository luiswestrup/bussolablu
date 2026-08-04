-- ENUMS
CREATE TYPE public.papel_usuario AS ENUM ('admin','financeiro','estoque');
CREATE TYPE public.tipo_categoria AS ENUM ('despesa','receita','produto');
CREATE TYPE public.status_pagar AS ENUM ('pendente','pago','vencido');
CREATE TYPE public.status_receber AS ENUM ('pendente','recebido','vencido');
CREATE TYPE public.tipo_movimento AS ENUM ('entrada','saida');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- EMPRESA
CREATE TABLE public.empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa TO authenticated;
GRANT ALL ON public.empresa TO service_role;
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

-- USUARIO_EMPRESA
CREATE TABLE public.usuario_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  papel public.papel_usuario NOT NULL DEFAULT 'admin',
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id)
);
GRANT SELECT ON public.usuario_empresa TO authenticated;
GRANT ALL ON public.usuario_empresa TO service_role;
ALTER TABLE public.usuario_empresa ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pertence_empresa(_empresa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuario_empresa ue
    WHERE ue.empresa_id = _empresa_id AND ue.user_id = auth.uid());
$$;

CREATE POLICY "ver minhas vinculacoes" ON public.usuario_empresa
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "ver minhas empresas" ON public.empresa
  FOR SELECT TO authenticated USING (public.pertence_empresa(id));
CREATE POLICY "atualizar minhas empresas" ON public.empresa
  FOR UPDATE TO authenticated USING (public.pertence_empresa(id)) WITH CHECK (public.pertence_empresa(id));

-- CATEGORIA
CREATE TABLE public.categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo public.tipo_categoria NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categoria TO authenticated;
GRANT ALL ON public.categoria TO service_role;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categoria por empresa" ON public.categoria FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));

-- FORNECEDOR
CREATE TABLE public.fornecedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  contato text,
  documento text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedor TO authenticated;
GRANT ALL ON public.fornecedor TO service_role;
ALTER TABLE public.fornecedor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedor por empresa" ON public.fornecedor FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));

-- CLIENTE
CREATE TABLE public.cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  contato text,
  documento text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente TO authenticated;
GRANT ALL ON public.cliente TO service_role;
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cliente por empresa" ON public.cliente FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));

-- CONTA A PAGAR
CREATE TABLE public.conta_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  categoria_id uuid REFERENCES public.categoria(id) ON DELETE SET NULL,
  fornecedor_id uuid REFERENCES public.fornecedor(id) ON DELETE SET NULL,
  forma_pagamento text,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status public.status_pagar NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conta_pagar TO authenticated;
GRANT ALL ON public.conta_pagar TO service_role;
ALTER TABLE public.conta_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conta_pagar por empresa" ON public.conta_pagar FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));
CREATE TRIGGER trg_conta_pagar_updated BEFORE UPDATE ON public.conta_pagar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTA A RECEBER
CREATE TABLE public.conta_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric(14,2) NOT NULL CHECK (valor >= 0),
  categoria_id uuid REFERENCES public.categoria(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.cliente(id) ON DELETE SET NULL,
  forma_recebimento text,
  data_vencimento date NOT NULL,
  data_recebimento date,
  status public.status_receber NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conta_receber TO authenticated;
GRANT ALL ON public.conta_receber TO service_role;
ALTER TABLE public.conta_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conta_receber por empresa" ON public.conta_receber FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));
CREATE TRIGGER trg_conta_receber_updated BEFORE UPDATE ON public.conta_receber
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUTO
CREATE TABLE public.produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sku text,
  categoria_id uuid REFERENCES public.categoria(id) ON DELETE SET NULL,
  custo numeric(14,2) NOT NULL DEFAULT 0,
  preco_venda numeric(14,2) NOT NULL DEFAULT 0,
  quantidade numeric(14,3) NOT NULL DEFAULT 0,
  estoque_minimo numeric(14,3) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto TO authenticated;
GRANT ALL ON public.produto TO service_role;
ALTER TABLE public.produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produto por empresa" ON public.produto FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));
CREATE TRIGGER trg_produto_updated BEFORE UPDATE ON public.produto
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MOVIMENTO DE ESTOQUE
CREATE TABLE public.movimento_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresa(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produto(id) ON DELETE CASCADE,
  tipo public.tipo_movimento NOT NULL,
  quantidade numeric(14,3) NOT NULL CHECK (quantidade > 0),
  custo_unitario numeric(14,2),
  observacao text,
  data date NOT NULL DEFAULT current_date,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimento_estoque TO authenticated;
GRANT ALL ON public.movimento_estoque TO service_role;
ALTER TABLE public.movimento_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimento por empresa" ON public.movimento_estoque FOR ALL TO authenticated
  USING (public.pertence_empresa(empresa_id)) WITH CHECK (public.pertence_empresa(empresa_id));

CREATE OR REPLACE FUNCTION public.aplicar_movimento_estoque() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.produto SET quantidade = quantidade + (CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END)
    WHERE id = NEW.produto_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.produto SET quantidade = quantidade - (CASE WHEN OLD.tipo = 'entrada' THEN OLD.quantidade ELSE -OLD.quantidade END)
    WHERE id = OLD.produto_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_movimento_estoque
AFTER INSERT OR DELETE ON public.movimento_estoque
FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimento_estoque();

CREATE INDEX idx_pagar_empresa ON public.conta_pagar(empresa_id, data_vencimento);
CREATE INDEX idx_receber_empresa ON public.conta_receber(empresa_id, data_vencimento);
CREATE INDEX idx_produto_empresa ON public.produto(empresa_id);
CREATE INDEX idx_mov_empresa ON public.movimento_estoque(empresa_id, data);

-- EMPRESAS DE EXEMPLO
INSERT INTO public.empresa (id, nome, cnpj) VALUES
  ('11111111-1111-1111-1111-111111111111','Comercial Aurora Ltda','12.345.678/0001-90'),
  ('22222222-2222-2222-2222-222222222222','Distribuidora Vega ME','98.765.432/0001-10');

-- Novo usuário entra automaticamente nas duas empresas como admin
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usuario_empresa (user_id, empresa_id, papel)
  SELECT NEW.id, e.id, 'admin' FROM public.empresa e
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();