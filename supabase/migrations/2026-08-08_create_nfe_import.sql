-- 2026-08-08_create_nfe_import.sql

-- 1) Tabela nota_fiscal_importada
create table if not exists public.nota_fiscal_importada (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  chave_acesso varchar(44) not null,
  fornecedor_id uuid references public.fornecedor(id),
  numero_nota text,
  data_emissao date,
  valor_total numeric(14,2),
  status text not null default 'importada', -- importada | erro
  criado_em timestamptz default now(),
  constraint uq_nfe_empresa_chave unique (empresa_id, chave_acesso)
);

-- 2) Tabela produto_fornecedor_map
create table if not exists public.produto_fornecedor_map (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedor(id),
  codigo_produto_fornecedor text not null,
  produto_id uuid references public.produto(id),
  criado_em timestamptz default now(),
  constraint uq_map_fornecedor_codigo unique (empresa_id, fornecedor_id, codigo_produto_fornecedor)
);

-- 3) Tabela para itens não reconhecidos (pendentes de mapeamento)
create table if not exists public.nfe_item_pending (
  id uuid default gen_random_uuid() primary key,
  nota_fiscal_id uuid references public.nota_fiscal_importada(id) on delete cascade,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  fornecedor_id uuid references public.fornecedor(id),
  codigo_prod_fornecedor text,
  descricao text,
  quantidade numeric(14,4),
  valor_unitario numeric(14,4),
  valor_total numeric(14,4),
  criado_em timestamptz default now(),
  resolved boolean default false
);

-- 4) Habilitar RLS
alter table public.nota_fiscal_importada enable row level security;
alter table public.produto_fornecedor_map enable row level security;
alter table public.nfe_item_pending enable row level security;

-- 5) Policies (padrão por empresa usando usuario_empresa.user_id = auth.uid())

-- nota_fiscal_importada: select/insert allowed for users of the company (admin/financeiro/estoque)
create policy if not exists "rls_nfe_select"
  on public.nota_fiscal_importada
  for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy if not exists "rls_nfe_insert"
  on public.nota_fiscal_importada
  for insert
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy if not exists "rls_nfe_update"
  on public.nota_fiscal_importada
  for update
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  )
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

-- produto_fornecedor_map: select/insert/update allowed for company users (admin/estoque)
create policy if not exists "rls_map_select"
  on public.produto_fornecedor_map
  for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy if not exists "rls_map_write"
  on public.produto_fornecedor_map
  for insert, update, delete
  with check (
    exists (
      select 1 from public.usuario_empresa ue where ue.user_id = auth.uid() and ue.empresa_id = empresa_id and ue.papel in ('admin','estoque')
    )
  );

-- nfe_item_pending: only company users can see; resolution allowed for admin/estoque
create policy if not exists "rls_pending_select"
  on public.nfe_item_pending
  for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy if not exists "rls_pending_resolve"
  on public.nfe_item_pending
  for update
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.usuario_empresa ue where ue.user_id = auth.uid() and ue.empresa_id = empresa_id and ue.papel in ('admin','estoque')
    )
  );

-- 6) Indexes úteis
create index if not exists idx_nfe_empresa_chave on public.nota_fiscal_importada (empresa_id, chave_acesso);
create index if not exists idx_map_empresa_fornecedor_codigo on public.produto_fornecedor_map (empresa_id, fornecedor_id, codigo_produto_fornecedor);
create index if not exists idx_pending_empresa on public.nfe_item_pending (empresa_id);
